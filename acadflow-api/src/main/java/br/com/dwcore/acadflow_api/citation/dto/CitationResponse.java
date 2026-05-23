package br.com.dwcore.acadflow_api.citation.dto;

import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.citation.service.CitationFormatter;

import java.time.LocalDateTime;
import java.util.UUID;

public record CitationResponse(
        UUID id,
        UUID projectId,
        UUID chapterId,
        UUID referenceId,
        String type,
        String displayMode,
        String pageNumber,
        String apudAuthor,
        String apudYear,
        String quotedText,
        String abntInlineText,
        LocalDateTime createdAt
) {
    public static CitationResponse from(Citation citation) {
        return new CitationResponse(
                citation.getId(),
                citation.getProject().getId(),
                citation.getChapter().getId(),
                citation.getReference().getId(),
                citation.getType().name(),
                citation.getDisplayMode().name(),
                citation.getPageNumber(),
                citation.getApudAuthor(),
                citation.getApudYear(),
                citation.getQuotedText(),
                CitationFormatter.format(citation),
                citation.getCreatedAt()
        );
    }
}
