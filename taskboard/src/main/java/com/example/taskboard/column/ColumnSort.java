package com.example.taskboard.column;

import com.example.taskboard.task.TaskSortKey;
import com.example.taskboard.task.TaskStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** カラム(状態)ごとに選んだ並び順。行がないカラムは「手動」として扱う。 */
@Entity
@Table(name = "column_sorts")
public class ColumnSort {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TaskStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskSortKey sortKey;

    protected ColumnSort() {
    }

    public ColumnSort(TaskStatus status, TaskSortKey sortKey) {
        this.status = status;
        this.sortKey = sortKey;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public TaskSortKey getSortKey() {
        return sortKey;
    }

    public void changeSortKey(TaskSortKey sortKey) {
        this.sortKey = sortKey;
    }
}
