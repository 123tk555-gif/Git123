package com.example.taskboard.task;

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
