package br.com.dwcore.acadflow_api.chapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateSectionRequest(
        @NotBlank(message = "Título é obrigatório") String title,
        @NotNull(message = "Ordem da seção é obrigatória") Integer sectionOrder
) {}
