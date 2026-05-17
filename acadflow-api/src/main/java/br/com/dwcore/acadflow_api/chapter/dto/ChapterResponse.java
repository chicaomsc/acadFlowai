package br.com.dwcore.acadflow_api.chapter.dto;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChapterResponse(
        UUID id,
        UUID projectId,
        String title,
        String type,
        String content,
        String status,
        Integer orderIndex,
        Integer wordCount,
        Integer targetWordCount,
        LocalDateTime lastEditedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ChapterResponse from(Chapter chapter) {
        return new ChapterResponse(
                chapter.getId(),
                chapter.getProject().getId(),
                chapter.getTitle(),
                chapter.getType().name(),
                chapter.getContent(),
                chapter.getStatus().name(),
                chapter.getOrderIndex(),
                chapter.getWordCount(),
                chapter.getTargetWordCount(),
                chapter.getLastEditedAt(),
                chapter.getCreatedAt(),
                chapter.getUpdatedAt()
        );
    }
}
