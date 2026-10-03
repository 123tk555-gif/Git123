package com.example.taskboard.column;

import com.example.taskboard.task.TaskSortKey;
import com.example.taskboard.task.TaskStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ColumnSortService {

    private final ColumnSortRepository repository;

    public ColumnSortService(ColumnSortRepository repository) {
        this.repository = repository;
    }

    /** まだ一度も選ばれていないカラムは「手動」。読み取りでは何も保存しない。 */
    public TaskSortKey get(TaskStatus status) {
        return repository.findById(status).map(ColumnSort::getSortKey).orElse(TaskSortKey.MANUAL);
    }

    @Transactional
    public TaskSortKey change(TaskStatus status, TaskSortKey sortKey) {
        ColumnSort columnSort = repository.findById(status).orElseGet(() -> new ColumnSort(status, sortKey));
        columnSort.changeSortKey(sortKey);
        return repository.save(columnSort).getSortKey();
    }
}
