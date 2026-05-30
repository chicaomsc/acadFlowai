package br.com.dwcore.acadflow_api.academictable.dto;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTable;
import br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType;

import java.time.LocalDateTime;
import java.util.UUID;

public record AcademicTableResponse(
        UUID id,
        UUID projectId,
        UUID chapterId,
        AcademicTableType type,
        String title,
        String sourceText,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static AcademicTableResponse from(AcademicTable table) {
        return new AcademicTableResponse(
                table.getId(),
                table.getProject().getId(),
                table.getChapter().getId(),
                table.getType(),
                table.getTitle(),
                table.getSourceText(),
                table.getContent(),
                table.getCreatedAt(),
                table.getUpdatedAt()
        );
    }
}
