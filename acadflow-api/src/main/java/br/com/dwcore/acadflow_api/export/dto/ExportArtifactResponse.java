package br.com.dwcore.acadflow_api.export.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ExportArtifactResponse(
        UUID projectId,
        String format,
        String fileName,
        String downloadUrl,
        LocalDateTime generatedAt
) {}
