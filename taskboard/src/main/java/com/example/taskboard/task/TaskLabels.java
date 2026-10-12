package com.example.taskboard.task;

import java.time.LocalDate;

/** 操作履歴の説明文に使う日本語の表記。画面の表記(frontend/src/labels.js)とそろえる。 */
final class TaskLabels {

    private TaskLabels() {
    }

    static String status(TaskStatus status) {
        return switch (status) {
            case TODO -> "未着手";
            case IN_PROGRESS -> "進行中";
            case DONE -> "完了";
        };
    }

    static String priority(Priority priority) {
        return switch (priority) {
            case HIGH -> "高";
            case MEDIUM -> "中";
            case LOW -> "低";
        };
    }

    static String color(CardColor color) {
        return switch (color) {
            case WHITE -> "白";
            case YELLOW -> "黄";
            case GREEN -> "緑";
            case BLUE -> "青";
            case PINK -> "ピンク";
            case ORANGE -> "オレンジ";
        };
    }

    static String date(LocalDate date) {
        return date == null ? "なし" : date.getYear() + "年" + date.getMonthValue() + "月" + date.getDayOfMonth() + "日";
    }

    static String text(String value) {
        return value == null || value.isBlank() ? "なし" : "「" + value + "」";
    }
}
