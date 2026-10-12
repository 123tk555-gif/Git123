package com.example.taskboard.history;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** 操作履歴を保存し、同じ内容をサーバーのログ(logs/taskboard.log)にも書く。 */
@Component
public class HistoryRecorder {

    private static final Logger log = LoggerFactory.getLogger(HistoryRecorder.class);

    private final TaskHistoryRepository repository;

    public HistoryRecorder(TaskHistoryRepository repository) {
        this.repository = repository;
    }

    public void record(Long taskId, String taskTitle, HistoryAction action, String detail) {
        repository.save(new TaskHistory(taskId, taskTitle, action, detail));
        log.info("{} id={} 「{}」 {}", action, taskId, taskTitle, detail);
    }
}
