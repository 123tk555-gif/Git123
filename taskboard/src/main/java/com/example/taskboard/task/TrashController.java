package com.example.taskboard.task;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/trash")
public class TrashController {

    private final TaskService service;

    public TrashController(TaskService service) {
        this.service = service;
    }

    /** ゴミ箱の一覧(新しく入れた順) */
    @GetMapping
    public TrashResponse list() {
        return new TrashResponse(
                service.retentionDays(),
                service.trash().stream()
                        .map(task -> new TrashResponse.Item(TaskResponse.from(task), task.getDeletedAt(), service.purgeAt(task)))
                        .toList());
    }

    /** 元の列の末尾に戻す */
    @PostMapping("/{id}/restore")
    public TaskResponse restore(@PathVariable long id) {
        return service.restore(id).map(TaskResponse::from).orElseThrow(() -> notInTrash(id));
    }

    /** 1件を完全に削除する */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void purge(@PathVariable long id) {
        if (!service.purge(id)) {
            throw notInTrash(id);
        }
    }

    /** ゴミ箱を空にする。消した件数を返す */
    @DeleteMapping
    public Map<String, Integer> empty() {
        return Map.of("deleted", service.emptyTrash());
    }

    private static ResponseStatusException notInTrash(long id) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "ゴミ箱にそのカードはありません: " + id);
    }
}
