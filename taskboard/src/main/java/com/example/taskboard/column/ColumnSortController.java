package com.example.taskboard.column;

import com.example.taskboard.task.TaskStatus;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/columns/{status}/sort")
public class ColumnSortController {

    private final ColumnSortService service;

    public ColumnSortController(ColumnSortService service) {
        this.service = service;
    }

    @GetMapping
    public ColumnSortResponse get(@PathVariable TaskStatus status) {
        return new ColumnSortResponse(status, service.get(status));
    }

    @PutMapping
    public ColumnSortResponse change(@PathVariable TaskStatus status, @Valid @RequestBody ColumnSortRequest request) {
        return new ColumnSortResponse(status, service.change(status, request.sort()));
    }
}
