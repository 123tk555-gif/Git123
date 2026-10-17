package com.example.taskboard.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** 画面に「体験版かどうか」などを伝える。 */
@RestController
public class AppInfoController {

    /** demo: 体験版か / resetLabel: 元に戻る時刻の説明 / maxTasks: カードの上限(0 は上限なし) */
    public record AppInfo(boolean demo, String resetLabel, int maxTasks) {
    }

    private final AppInfo info;

    public AppInfoController(
            @Value("${taskboard.demo.enabled:false}") boolean demo,
            @Value("${taskboard.demo.reset-label:毎日 午前4時(日本時間)}") String resetLabel,
            @Value("${taskboard.max-tasks:0}") int maxTasks) {
        this.info = new AppInfo(demo, resetLabel, maxTasks);
    }

    @GetMapping("/api/app-info")
    public AppInfo info() {
        return info;
    }
}
