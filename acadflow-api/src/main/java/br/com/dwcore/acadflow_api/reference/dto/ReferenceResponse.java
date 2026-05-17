package br.com.dwcore.acadflow_api.reference.dto;

import br.com.dwcore.acadflow_api.reference.domain.Reference;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ReferenceResponse(
        UUID id,
        UUID projectId,
        UUID primaryChapterId,
        String title,
        String authors,
        String type,
        Integer year,
        String journal,
        String publisher,
        String doi,
        String url,
        LocalDate accessDate,
        String abntFormatted,
        boolean hasCitation,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ReferenceResponse from(Reference reference) {
        return new ReferenceResponse(
                reference.getId(),
                reference.getProject().getId(),
                reference.getPrimaryChapter() != null ? reference.getPrimaryChapter().getId() : null,
                reference.getTitle(),
                reference.getAuthors(),
                reference.getType().name(),
                reference.getYear(),
                reference.getJournal(),
                reference.getPublisher(),
                reference.getDoi(),
                reference.getUrl(),
                reference.getAccessDate(),
                reference.getAbntFormatted(),
                reference.isHasCitation(),
                reference.getCreatedAt(),
                reference.getUpdatedAt()
        );
    }
}
