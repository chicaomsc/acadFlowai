package br.com.dwcore.acadflow_api.export.dto;

import java.util.List;
import java.util.UUID;

public record ExportStatusResponse(
        UUID projectId,
        String format,
        boolean ready,
        int progress,
        List<String> pendingItems,
        List<String> completedItems,
        int metadataCoverage,
        int chapterCoverage,
        int referenceCoverage
) {}
