package com.example.taskboard.task;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Constructor;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class TaskServiceTest {

    private static Task task(long id, LocalDate dueDate, Priority priority, String category, int sortOrder) {
        try {
            Constructor<Task> constructor = Task.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Task task = constructor.newInstance();
            ReflectionTestUtils.setField(task, "id", id);
            ReflectionTestUtils.setField(task, "title", "タスク" + id);
            ReflectionTestUtils.setField(task, "status", TaskStatus.TODO);
            ReflectionTestUtils.setField(task, "dueDate", dueDate);
            ReflectionTestUtils.setField(task, "priority", priority);
            ReflectionTestUtils.setField(task, "category", category);
            ReflectionTestUtils.setField(task, "color", CardColor.WHITE);
            ReflectionTestUtils.setField(task, "sortOrder", sortOrder);
            ReflectionTestUtils.setField(task, "createdAt", Instant.EPOCH);
            return task;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private static List<Long> ids(List<Task> tasks) {
        return tasks.stream().map(Task::getId).toList();
    }

    private final LocalDate today = LocalDate.of(2026, 10, 3);

    private final List<Task> tasks = List.of(
            task(1, today.plusDays(5), Priority.LOW, "勉強", 1),
            task(2, null, Priority.HIGH, null, 2),
            task(3, today.minusDays(1), Priority.MEDIUM, "仕事", 3),
            task(4, today.plusDays(5), Priority.HIGH, "仕事", 4),
            task(5, null, Priority.LOW, "", 5));

    @Test
    void 手動順はsortOrder順() {
        assertThat(ids(TaskService.sorted(tasks, TaskSortKey.MANUAL))).containsExactly(1L, 2L, 3L, 4L, 5L);
    }

    @Test
    void 期限順は近い順で期限なしが末尾_同じ期限は手動順() {
        assertThat(ids(TaskService.sorted(tasks, TaskSortKey.DUE_DATE))).containsExactly(3L, 1L, 4L, 2L, 5L);
    }

    @Test
    void 優先度順は高から低_同順位は手動順() {
        assertThat(ids(TaskService.sorted(tasks, TaskSortKey.PRIORITY))).containsExactly(2L, 4L, 3L, 1L, 5L);
    }

    @Test
    void カテゴリ順は名前順でカテゴリなしと空文字が末尾_同順位は手動順() {
        assertThat(ids(TaskService.sorted(tasks, TaskSortKey.CATEGORY))).containsExactly(3L, 4L, 1L, 2L, 5L);
    }
}
