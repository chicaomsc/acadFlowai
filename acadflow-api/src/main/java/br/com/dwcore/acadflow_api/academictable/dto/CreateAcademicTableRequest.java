package br.com.dwcore.acadflow_api.academictable.dto;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateAcademicTableRequest(
        @NotNull(message = "chapterId é obrigatório")
        UUID chapterId,

        @NotNull(message = "type é obrigatório")
        AcademicTableType type,

        @NotBlank(message = "title é obrigatório")
        String title,

        String sourceText,

        @NotBlank(message = "content é obrigatório")
        String content
) {}
