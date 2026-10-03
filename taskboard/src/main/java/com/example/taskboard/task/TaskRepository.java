package com.example.taskboard.task;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    @Query("select coalesce(max(t.sortOrder), 0) from Task t where t.status = :status")
    int maxSortOrder(@Param("status") TaskStatus status);
}
