package com.example.taskboard.history;

import java.util.List;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskHistoryRepository extends JpaRepository<TaskHistory, Long> {

    List<TaskHistory> findAllByOrderByOccurredAtDescIdDesc(Limit limit);

    List<TaskHistory> findByTaskIdOrderByOccurredAtDescIdDesc(Long taskId, Limit limit);
}
