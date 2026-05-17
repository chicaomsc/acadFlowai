package br.com.dwcore.acadflow_api.chapter.dto;

import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateChapterStatusRequest(
        @NotNull(message = "Status é obrigatório")
        ChapterStatus status
) {}
