package br.com.dwcore.acadflow_api.academictable.dto;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType;

public record UpdateAcademicTableRequest(
        AcademicTableType type,
        String title,
        String sourceText,
        String content
) {}
