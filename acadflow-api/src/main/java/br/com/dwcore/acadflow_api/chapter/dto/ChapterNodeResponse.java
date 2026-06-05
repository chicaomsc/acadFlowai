package br.com.dwcore.acadflow_api.chapter.dto;

import java.util.List;
import java.util.UUID;

public record ChapterNodeResponse(
        UUID id,
        String title,
        Integer level,
        String numbering,
        String status,
        Integer wordCount,
        List<ChapterNodeResponse> children
) {}
