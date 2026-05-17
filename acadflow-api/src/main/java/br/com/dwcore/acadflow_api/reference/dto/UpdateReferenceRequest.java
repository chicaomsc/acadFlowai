package br.com.dwcore.acadflow_api.reference.dto;

import br.com.dwcore.acadflow_api.reference.domain.ReferenceType;

import java.time.LocalDate;
import java.util.UUID;

public record UpdateReferenceRequest(
        UUID primaryChapterId,
        String title,
        String authors,
        ReferenceType type,
        Integer year,
        String journal,
        String publisher,
        String doi,
        String url,
        LocalDate accessDate,
        Boolean hasCitation
) {}
