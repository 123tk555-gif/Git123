package com.example.taskboard.task;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class TaskService {

    private static final Comparator<Task> MANUAL_ORDER =
            Comparator.comparingInt(Task::getSortOrder).thenComparing(Task::getId);

    private final TaskRepository repository;

    public TaskService(TaskRepository repository) {
        this.repository = repository;
    }

    public List<Task> search(TaskStatus status, Priority priority, String category, String keyword, TaskSortKey sort) {
        List<Task> tasks = repository.findAll(TaskSpecifications.matching(status, priority, category, keyword));
        return sorted(tasks, sort);
    }

    public Optional<Task> findById(long id) {
        return repository.findById(id);
    }

    /** 状態・優先度・色を省略したときは「未着手・中・白」にし、その状態の列の末尾に追加する。 */
    @Transactional
    public Task create(TaskRequest request) {
        TaskStatus status = request.status() != null ? request.status() : TaskStatus.TODO;
        Priority priority = request.priority() != null ? request.priority() : Priority.MEDIUM;
        CardColor color = request.color() != null ? request.color() : CardColor.WHITE;
        Task task = new Task(request.normalizedTitle(), status, request.dueDate(), priority,
                request.normalizedCategory(), color, repository.maxSortOrder(status) + 1);
        return repository.save(task);
    }

    /** 全項目を置き換える。状態が変わるときは、移動先の列の末尾に置く。 */
    @Transactional
    public Optional<Task> update(long id, TaskRequest request) {
        return repository.findById(id).map(task -> {
            int nextOrder = request.status() != task.getStatus()
                    ? repository.maxSortOrder(request.status()) + 1
                    : task.getSortOrder();
            task.update(request.normalizedTitle(), request.dueDate(), request.priority(),
                    request.normalizedCategory(), request.color());
            task.moveTo(request.status(), nextOrder);
            return task;
        });
    }

    /**
     * 指定した列の「手動の並び順」の index 番目(0 が先頭)に入れ、その列の並び位置を 1 から振り直す。
     * index が列の件数より大きいときは末尾に入れる。別の列から来たときは、元の列も詰めて振り直す。
     */
    @Transactional
    public Optional<Task> move(long id, TaskStatus status, int index) {
        return repository.findById(id).map(task -> {
            TaskStatus from = task.getStatus();
            List<Task> target = new ArrayList<>(manualOrderOf(status));
            target.removeIf(t -> t.getId().equals(task.getId()));
            target.add(Math.min(index, target.size()), task);
            renumber(target, status);
            if (from != status) {
                List<Task> source = new ArrayList<>(manualOrderOf(from));
                source.removeIf(t -> t.getId().equals(task.getId()));
                renumber(source, from);
            }
            return task;
        });
    }

    private List<Task> manualOrderOf(TaskStatus status) {
        return sorted(repository.findAll(TaskSpecifications.matching(status, null, null, null)), TaskSortKey.MANUAL);
    }

    private static void renumber(List<Task> tasks, TaskStatus status) {
        for (int i = 0; i < tasks.size(); i++) {
            tasks.get(i).moveTo(status, i + 1);
        }
    }

    @Transactional
    public boolean delete(long id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
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
}
