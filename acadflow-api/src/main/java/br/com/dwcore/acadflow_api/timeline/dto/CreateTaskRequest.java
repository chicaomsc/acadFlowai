package br.com.dwcore.acadflow_api.timeline.dto;

import br.com.dwcore.acadflow_api.timeline.domain.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record CreateTaskRequest(
        @NotNull(message = "Projeto é obrigatório")
        UUID projectId,

        UUID chapterId,

        @NotBlank(message = "Título é obrigatório")
        @Size(max = 500, message = "Título deve ter no máximo 500 caracteres")
        String title,

        String description,

        LocalDate dueDate,

        @NotNull(message = "Prioridade é obrigatória")
        TaskPriority priority,

        Integer orderIndex
) {}
