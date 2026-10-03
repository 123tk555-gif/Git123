package com.example.taskboard.task;

import java.time.Instant;
import java.time.LocalDate;

public record TaskResponse(
        Long id,
        String title,
        TaskStatus status,
        LocalDate dueDate,
        Priority priority,
        String category,
        CardColor color,
        int sortOrder,
        Instant createdAt) {

    static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getStatus(),
                task.getDueDate(),
                task.getPriority(),
                task.getCategory(),
                task.getColor(),
                task.getSortOrder(),
                task.getCreatedAt());
    }
}
