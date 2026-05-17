package br.com.dwcore.acadflow_api.timeline.dto;

import br.com.dwcore.acadflow_api.timeline.domain.TimelineTask;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        UUID projectId,
        UUID chapterId,
        String title,
        String description,
        LocalDate dueDate,
        String priority,
        String status,
        Integer orderIndex,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static TaskResponse from(TimelineTask task) {
        return new TaskResponse(
                task.getId(),
                task.getProject().getId(),
                task.getChapter() != null ? task.getChapter().getId() : null,
                task.getTitle(),
                task.getDescription(),
                task.getDueDate(),
                task.getPriority().name(),
                task.getStatus().name(),
                task.getOrderIndex(),
                task.getCreatedAt(),
                task.getUpdatedAt()
        );
    }
}
