package com.example.taskboard.column;

import com.example.taskboard.task.TaskSortKey;
import jakarta.validation.constraints.NotNull;

public record ColumnSortRequest(
        @NotNull(message = "並び順(sort)を指定してください")
        TaskSortKey sort) {
}
