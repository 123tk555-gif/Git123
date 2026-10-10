package com.example.taskboard.task;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    @GetMapping
    public List<TaskResponse> list(
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "MANUAL") TaskSortKey sort) {
        return service.search(status, priority, category, keyword, sort).stream()
                .map(TaskResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public TaskResponse get(@PathVariable long id) {
        return service.findById(id)
                .map(TaskResponse::from)
                .orElseThrow(() -> notFound(id));
    }

    @PostMapping
    public ResponseEntity<TaskResponse> create(@Valid @RequestBody TaskRequest request) {
        TaskResponse created = TaskResponse.from(service.create(request));
        return ResponseEntity.created(URI.create("/api/tasks/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public TaskResponse update(@PathVariable long id, @Valid @RequestBody TaskRequest request) {
        if (request.status() == null || request.priority() == null || request.color() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "更新では status・priority・color を必ず指定してください");
        }
        return service.update(id, request)
                .map(TaskResponse::from)
                .orElseThrow(() -> notFound(id));
    }

    @PutMapping("/{id}/position")
    public TaskResponse move(@PathVariable long id, @Valid @RequestBody TaskMoveRequest request) {
        return service.move(id, request.status(), request.index())
                .map(TaskResponse::from)
                .orElseThrow(() -> notFound(id));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        if (!service.delete(id)) {
            throw notFound(id);
        }
    }

    private static ResponseStatusException notFound(long id) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "タスクが見つかりません: " + id);
    }
}
