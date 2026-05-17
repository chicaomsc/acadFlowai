package br.com.dwcore.acadflow_api.timeline.repository;

import br.com.dwcore.acadflow_api.timeline.domain.TimelineTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TimelineTaskRepository extends JpaRepository<TimelineTask, UUID> {

    List<TimelineTask> findByProjectIdOrderByOrderIndexAscCreatedAtAsc(UUID projectId);
}
