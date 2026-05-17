package br.com.dwcore.acadflow_api.timeline.dto;

import br.com.dwcore.acadflow_api.timeline.domain.TaskPriority;

import java.time.LocalDate;
import java.util.UUID;

public record UpdateTaskRequest(
        UUID chapterId,
        String title,
        String description,
        LocalDate dueDate,
        TaskPriority priority,
        Integer orderIndex
) {}
