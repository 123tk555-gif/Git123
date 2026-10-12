package com.example.taskboard.task;

import com.example.taskboard.history.HistoryAction;
import com.example.taskboard.history.HistoryRecorder;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class TaskService {

    private static final Comparator<Task> MANUAL_ORDER =
            Comparator.comparingInt(Task::getSortOrder).thenComparing(Task::getId);

    private final TaskRepository repository;
    private final HistoryRecorder history;
    private final int retentionDays;

    public TaskService(TaskRepository repository, HistoryRecorder history,
            @Value("${taskboard.trash.retention-days:30}") int retentionDays) {
        this.repository = repository;
        this.history = history;
        this.retentionDays = retentionDays;
    }

    public int retentionDays() {
        return retentionDays;
    }

    public List<Task> search(TaskStatus status, Priority priority, String category, String keyword, TaskSortKey sort) {
        List<Task> tasks = repository.findAll(TaskSpecifications.matching(status, priority, category, keyword));
        return sorted(tasks, sort);
    }

    /** ボードに表示中のカードだけを探す(ゴミ箱のカードは見つからない扱い) */
    public Optional<Task> findById(long id) {
        return repository.findByIdAndDeletedAtIsNull(id);
    }

    /** 状態・優先度・色を省略したときは「未着手・中・白」にし、その状態の列の末尾に追加する。 */
    @Transactional
    public Task create(TaskRequest request) {
        TaskStatus status = request.status() != null ? request.status() : TaskStatus.TODO;
        Priority priority = request.priority() != null ? request.priority() : Priority.MEDIUM;
        CardColor color = request.color() != null ? request.color() : CardColor.WHITE;
        Task task = repository.save(new Task(request.normalizedTitle(), status, request.dueDate(), priority,
                request.normalizedCategory(), color, repository.maxSortOrder(status) + 1));
        history.record(task.getId(), task.getTitle(), HistoryAction.CREATED,
                "「" + TaskLabels.status(status) + "」に追加(期限: " + TaskLabels.date(task.getDueDate())
                        + "、優先度: " + TaskLabels.priority(priority) + "、カテゴリ: " + TaskLabels.text(task.getCategory())
                        + "、色: " + TaskLabels.color(color) + ")");
        return task;
    }

    /** 全項目を置き換える。状態が変わるときは、移動先の列の末尾に置く。 */
    @Transactional
    public Optional<Task> update(long id, TaskRequest request) {
        return repository.findByIdAndDeletedAtIsNull(id).map(task -> {
            Snapshot before = Snapshot.of(task);
            int nextOrder = request.status() != task.getStatus()
                    ? repository.maxSortOrder(request.status()) + 1
                    : task.getSortOrder();
            task.update(request.normalizedTitle(), request.dueDate(), request.priority(),
                    request.normalizedCategory(), request.color());
            task.moveTo(request.status(), nextOrder);
            history.record(task.getId(), task.getTitle(), HistoryAction.UPDATED, before.describeChangesTo(Snapshot.of(task)));
            return task;
        });
    }

    /**
     * 指定した列の「手動の並び順」の index 番目(0 が先頭)に入れ、その列の並び位置を 1 から振り直す。
     * index が列の件数より大きいときは末尾に入れる。別の列から来たときは、元の列も詰めて振り直す。
     */
    @Transactional
    public Optional<Task> move(long id, TaskStatus status, int index) {
        return repository.findByIdAndDeletedAtIsNull(id).map(task -> {
            TaskStatus from = task.getStatus();
            List<Task> source = new ArrayList<>(manualOrderOf(from));
            int fromPosition = source.indexOf(task) + 1;
            List<Task> target = from == status ? source : new ArrayList<>(manualOrderOf(status));
            target.removeIf(t -> t.getId().equals(task.getId()));
            int toIndex = Math.min(index, target.size());
            target.add(toIndex, task);
            task.moveTo(status, toIndex + 1);
            renumber(target);
            if (from != status) {
                source.removeIf(t -> t.getId().equals(task.getId()));
                renumber(source);
            }
            String detail = from == status
                    ? "「" + TaskLabels.status(status) + "」の中で並び位置を変更(上から" + fromPosition + "番目 → " + (toIndex + 1) + "番目)"
                    : "「" + TaskLabels.status(from) + "」から「" + TaskLabels.status(status) + "」へ移動(上から" + (toIndex + 1) + "番目)";
            history.record(task.getId(), task.getTitle(), HistoryAction.MOVED, detail);
            return task;
        });
    }

    private List<Task> manualOrderOf(TaskStatus status) {
        return sorted(repository.findAll(TaskSpecifications.matching(status, null, null, null)), TaskSortKey.MANUAL);
    }

    private static void renumber(List<Task> tasks) {
        for (int i = 0; i < tasks.size(); i++) {
            tasks.get(i).renumberTo(i + 1);
        }
    }

    /** ゴミ箱に移す(すぐには消さない)。見つからなければ false */
    @Transactional
    public boolean delete(long id) {
        return repository.findByIdAndDeletedAtIsNull(id).map(task -> {
            task.moveToTrash();
            history.record(task.getId(), task.getTitle(), HistoryAction.DELETED,
                    "ゴミ箱に移動(「" + TaskLabels.status(task.getStatus()) + "」から。" + retentionDays + "日後に自動で完全に削除)");
            return true;
        }).orElse(false);
    }

    // ---- ゴミ箱 ----

    public List<Task> trash() {
        return repository.findByDeletedAtIsNotNullOrderByDeletedAtDesc();
    }

    public Instant purgeAt(Task task) {
        return task.getDeletedAt().plus(Duration.ofDays(retentionDays));
    }

    /** ゴミ箱から元の列の末尾に戻す */
    @Transactional
    public Optional<Task> restore(long id) {
        return repository.findByIdAndDeletedAtIsNotNull(id).map(task -> {
            task.restore(repository.maxSortOrder(task.getStatus()) + 1);
            history.record(task.getId(), task.getTitle(), HistoryAction.RESTORED,
                    "ゴミ箱から「" + TaskLabels.status(task.getStatus()) + "」の末尾に戻した");
            return task;
        });
    }

    /** ゴミ箱のカードを完全に削除する。見つからなければ false */
    @Transactional
    public boolean purge(long id) {
        return repository.findByIdAndDeletedAtIsNotNull(id).map(task -> {
            purgeOne(task, "ゴミ箱から完全に削除");
            return true;
        }).orElse(false);
    }

    /** ゴミ箱を空にする。消した件数を返す */
    @Transactional
    public int emptyTrash() {
        List<Task> all = repository.findByDeletedAtIsNotNullOrderByDeletedAtDesc();
        all.forEach(task -> purgeOne(task, "ゴミ箱を空にして完全に削除"));
        return all.size();
    }

    /** ゴミ箱に入れてから保存期間を過ぎたカードを完全に削除する。消した件数を返す */
    @Transactional
    public int purgeExpired() {
        List<Task> expired = repository.findByDeletedAtBefore(Instant.now().minus(Duration.ofDays(retentionDays)));
        expired.forEach(task -> purgeOne(task, "ゴミ箱で" + retentionDays + "日たったため、自動で完全に削除"));
        return expired.size();
    }

    private void purgeOne(Task task, String detail) {
        history.record(task.getId(), task.getTitle(), HistoryAction.PURGED, detail);
        repository.delete(task);
    }

    /** 期限なし・カテゴリなしは末尾。同順位のときは手動の並び順にそろえる。 */
    static List<Task> sorted(List<Task> tasks, TaskSortKey key) {
        Comparator<Task> comparator = switch (key) {
            case MANUAL -> MANUAL_ORDER;
            case DUE_DATE -> Comparator.comparing(Task::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(MANUAL_ORDER);
            case PRIORITY -> Comparator.comparing(Task::getPriority).thenComparing(MANUAL_ORDER);
            case CATEGORY -> Comparator.comparing(TaskService::categoryOrNull,
                    Comparator.nullsLast(Comparator.<String>naturalOrder())).thenComparing(MANUAL_ORDER);
        };
        return tasks.stream().sorted(comparator).toList();
    }

    private static String categoryOrNull(Task task) {
        String category = task.getCategory();
        return category == null || category.isBlank() ? null : category;
    }

    /** 編集の前後を比べて、変わった項目だけを説明文にする */
    private record Snapshot(String title, TaskStatus status, LocalDate dueDate, Priority priority, String category,
            CardColor color) {

        static Snapshot of(Task task) {
            return new Snapshot(task.getTitle(), task.getStatus(), task.getDueDate(), task.getPriority(),
                    task.getCategory(), task.getColor());
        }

        String describeChangesTo(Snapshot after) {
            List<String> changes = new ArrayList<>();
            if (!Objects.equals(title, after.title)) {
                changes.add("内容: " + TaskLabels.text(title) + " → " + TaskLabels.text(after.title));
            }
            if (status != after.status) {
                changes.add("状態: " + TaskLabels.status(status) + " → " + TaskLabels.status(after.status));
            }
            if (!Objects.equals(dueDate, after.dueDate)) {
                changes.add("期限: " + TaskLabels.date(dueDate) + " → " + TaskLabels.date(after.dueDate));
            }
            if (priority != after.priority) {
                changes.add("優先度: " + TaskLabels.priority(priority) + " → " + TaskLabels.priority(after.priority));
            }
            if (!Objects.equals(category, after.category)) {
                changes.add("カテゴリ: " + TaskLabels.text(category) + " → " + TaskLabels.text(after.category));
            }
            if (color != after.color) {
                changes.add("色: " + TaskLabels.color(color) + " → " + TaskLabels.color(after.color));
            }
            return changes.isEmpty() ? "変更なし(保存のみ)" : String.join("、", changes);
        }
    }
}
