package br.com.dwcore.acadflow_api.chapter.dto;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChapterResponse(
        UUID id,
        UUID projectId,
        UUID parentId,
        String title,
        String type,
        String content,
        String status,
        Integer orderIndex,
        Integer sectionOrder,
        Integer level,
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
                chapter.getParent() != null ? chapter.getParent().getId() : null,
                chapter.getTitle(),
                chapter.getType().name(),
                chapter.getContent(),
                chapter.getStatus().name(),
                chapter.getOrderIndex(),
                chapter.getSectionOrder(),
                chapter.getLevel(),
                chapter.getWordCount(),
                chapter.getTargetWordCount(),
                chapter.getLastEditedAt(),
                chapter.getCreatedAt(),
                chapter.getUpdatedAt()
        );
    }
}
