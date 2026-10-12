package com.example.taskboard.history;

import java.time.Instant;

public record HistoryResponse(Long id, Long taskId, String taskTitle, HistoryAction action, String detail, Instant occurredAt) {

    static HistoryResponse from(TaskHistory history) {
        return new HistoryResponse(history.getId(), history.getTaskId(), history.getTaskTitle(), history.getAction(),
                history.getDetail(), history.getOccurredAt());
    }
}
