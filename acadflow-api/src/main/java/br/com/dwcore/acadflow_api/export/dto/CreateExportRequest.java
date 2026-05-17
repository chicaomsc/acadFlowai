package br.com.dwcore.acadflow_api.export.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public record CreateExportRequest(
        @NotNull(message = "Projeto é obrigatório")
        UUID projectId,

        @NotBlank(message = "Formato é obrigatório")
        @Pattern(regexp = "(?i)pdf|docx|slides", message = "Formato inválido. Use: pdf, docx ou slides")
        String format
) {}
