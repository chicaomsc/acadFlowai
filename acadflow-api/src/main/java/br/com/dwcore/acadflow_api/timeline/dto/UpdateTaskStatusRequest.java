package br.com.dwcore.acadflow_api.timeline.dto;

import br.com.dwcore.acadflow_api.timeline.domain.TaskStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateTaskStatusRequest(
        @NotNull(message = "Status é obrigatório")
        TaskStatus status
) {}
