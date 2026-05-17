package br.com.dwcore.acadflow_api.reference.dto;

import br.com.dwcore.acadflow_api.reference.domain.ReferenceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record CreateReferenceRequest(
        @NotNull(message = "Projeto é obrigatório")
        UUID projectId,

        UUID primaryChapterId,

        @NotBlank(message = "Título é obrigatório")
        @Size(max = 500, message = "Título deve ter no máximo 500 caracteres")
        String title,

        @NotBlank(message = "Autores são obrigatórios")
        @Size(max = 2000, message = "Autores devem ter no máximo 2000 caracteres")
        String authors,

        @NotNull(message = "Tipo é obrigatório")
        ReferenceType type,

        @NotNull(message = "Ano é obrigatório")
        Integer year,

        @Size(max = 500, message = "Periódico deve ter no máximo 500 caracteres")
        String journal,

        @Size(max = 500, message = "Editora deve ter no máximo 500 caracteres")
        String publisher,

        @Size(max = 500, message = "DOI deve ter no máximo 500 caracteres")
        String doi,

        @Size(max = 2000, message = "URL deve ter no máximo 2000 caracteres")
        String url,

        LocalDate accessDate,
        boolean hasCitation
) {}
