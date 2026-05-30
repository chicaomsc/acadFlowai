package br.com.dwcore.acadflow_api.figure.dto;

import br.com.dwcore.acadflow_api.figure.domain.Figure;
import java.time.LocalDateTime;
import java.util.UUID;

public record FigureResponse(
        UUID id,
        UUID projectId,
        UUID chapterId,
        String caption,
        String sourceText,
        String originalFilename,
        String mimeType,
        Long fileSizeBytes,
        Integer widthPercent,
        LocalDateTime createdAt,
        String imageUrl
) {
    public static FigureResponse from(Figure figure) {
        String imageUrl = "/projects/" + figure.getProject().getId()
                + "/figures/" + figure.getId() + "/image";
        return new FigureResponse(
                figure.getId(),
                figure.getProject().getId(),
                figure.getChapter().getId(),
                figure.getCaption(),
                figure.getSourceText(),
                figure.getOriginalFilename(),
                figure.getMimeType(),
                figure.getFileSizeBytes(),
                figure.getWidthPercent(),
                figure.getCreatedAt(),
                imageUrl
        );
    }
}
