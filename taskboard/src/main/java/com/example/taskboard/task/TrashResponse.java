package com.example.taskboard.task;

import java.time.Instant;
import java.util.List;

/** ゴミ箱の中身。retentionDays 日たつと自動で完全に削除される(purgeAt がその日時) */
public record TrashResponse(int retentionDays, List<Item> items) {

    public record Item(TaskResponse task, Instant deletedAt, Instant purgeAt) {
    }
}
