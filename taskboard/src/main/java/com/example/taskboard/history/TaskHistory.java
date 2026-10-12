package com.example.taskboard.history;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * 操作履歴の1件。カードを完全に削除しても履歴は残すため、tasks への外部キーは付けず、
 * そのときのカード名も一緒に保存する。
 */
@Entity
@Table(name = "task_history", indexes = @Index(name = "idx_task_history_task_id", columnList = "taskId"))
public class TaskHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long taskId;

    @Column(nullable = false)
    private String taskTitle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private HistoryAction action;

    @Column(nullable = false, length = 1000)
    private String detail;

    @Column(nullable = false)
    private Instant occurredAt;

    protected TaskHistory() {
    }

    TaskHistory(Long taskId, String taskTitle, HistoryAction action, String detail) {
        this.taskId = taskId;
        this.taskTitle = taskTitle;
        this.action = action;
        this.detail = detail.length() > 1000 ? detail.substring(0, 997) + "…" : detail;
        this.occurredAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getTaskId() {
        return taskId;
    }

    public String getTaskTitle() {
        return taskTitle;
    }

    public HistoryAction getAction() {
        return action;
    }

    public String getDetail() {
        return detail;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }
}
