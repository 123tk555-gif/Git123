package com.example.taskboard.history;

import java.util.List;
import org.springframework.data.domain.Limit;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private static final int MAX_LIMIT = 500;

    private final TaskHistoryRepository repository;

    public HistoryController(TaskHistoryRepository repository) {
        this.repository = repository;
    }

    /** 新しい順。taskId を付けるとそのカードの履歴だけ。limit は 1〜500(省略時 100) */
    @GetMapping
    @Transactional(readOnly = true)
    public List<HistoryResponse> list(
            @RequestParam(required = false) Long taskId,
            @RequestParam(defaultValue = "100") int limit) {
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "件数(limit)は1〜" + MAX_LIMIT + "で指定してください");
        }
        List<TaskHistory> found = taskId == null
                ? repository.findAllByOrderByOccurredAtDescIdDesc(Limit.of(limit))
                : repository.findByTaskIdOrderByOccurredAtDescIdDesc(taskId, Limit.of(limit));
        return found.stream().map(HistoryResponse::from).toList();
    }
}
