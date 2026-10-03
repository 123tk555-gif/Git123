package com.example.taskboard.column;

import com.example.taskboard.task.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ColumnSortRepository extends JpaRepository<ColumnSort, TaskStatus> {
}
