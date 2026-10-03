package com.example.taskboard.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** 追加(POST)と更新(PUT)で共通の入力。status・priority・color を省略したときの既定値は追加のときだけ使う。 */
public record TaskRequest(
        @NotBlank(message = "内容を入力してください")
        @Size(max = 200, message = "内容は200文字以内にしてください")
        String title,
        TaskStatus status,
        LocalDate dueDate,
        Priority priority,
        @Size(max = 50, message = "カテゴリは50文字以内にしてください")
        String category,
        CardColor color) {

    String normalizedTitle() {
        return title.trim();
    }

    String normalizedCategory() {
        return category == null || category.isBlank() ? null : category.trim();
    }
}
