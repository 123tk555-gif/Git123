package com.example.taskboard.task;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 保存期間を過ぎたゴミ箱のカードを、起動時と毎時0分に完全に削除する。 */
@Component
public class TrashCleaner {

    private static final Logger log = LoggerFactory.getLogger(TrashCleaner.class);

    private final TaskService service;

    public TrashCleaner(TaskService service) {
        this.service = service;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(cron = "0 0 * * * *")
    public void purgeExpired() {
        int count = service.purgeExpired();
        if (count > 0) {
            log.info("ゴミ箱で保存期間を過ぎたカードを{}件、自動で完全に削除しました", count);
        }
    }
}
