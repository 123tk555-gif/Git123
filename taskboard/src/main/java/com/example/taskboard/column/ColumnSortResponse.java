package com.example.taskboard.column;

import com.example.taskboard.task.TaskSortKey;
import com.example.taskboard.task.TaskStatus;

public record ColumnSortResponse(TaskStatus status, TaskSortKey sort) {
}
