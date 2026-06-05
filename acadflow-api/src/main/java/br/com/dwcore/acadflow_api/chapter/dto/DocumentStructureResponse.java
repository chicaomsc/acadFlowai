package br.com.dwcore.acadflow_api.chapter.dto;

import java.util.List;
import java.util.UUID;

public record DocumentStructureResponse(
        UUID projectId,
        List<ChapterNodeResponse> chapters
) {}
