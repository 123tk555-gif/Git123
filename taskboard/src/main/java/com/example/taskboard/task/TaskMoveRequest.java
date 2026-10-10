package com.example.taskboard.task;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** 移動先の列と、その列の「手動の並び順」の中での位置(0 が先頭)。 */
public record TaskMoveRequest(
        @NotNull(message = "移動先の状態(status)を指定してください")
        TaskStatus status,
        @NotNull(message = "移動先の位置(index)を指定してください")
        @Min(value = 0, message = "位置(index)は0以上にしてください")
        Integer index) {
}
