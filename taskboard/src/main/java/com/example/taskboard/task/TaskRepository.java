package com.example.taskboard.task;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    /** ボードに表示中(ゴミ箱以外)のカードの中で、その列の並び位置の最大値 */
    @Query("select coalesce(max(t.sortOrder), 0) from Task t where t.status = :status and t.deletedAt is null")
    int maxSortOrder(@Param("status") TaskStatus status);

    /** ボードに表示中のカード */
    Optional<Task> findByIdAndDeletedAtIsNull(Long id);

    /** ゴミ箱のカード */
    Optional<Task> findByIdAndDeletedAtIsNotNull(Long id);

    List<Task> findByDeletedAtIsNotNullOrderByDeletedAtDesc();

    List<Task> findByDeletedAtBefore(Instant threshold);
}
