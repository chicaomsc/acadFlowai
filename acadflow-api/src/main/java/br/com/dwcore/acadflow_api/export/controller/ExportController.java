package br.com.dwcore.acadflow_api.export.controller;

import br.com.dwcore.acadflow_api.export.dto.CreateExportRequest;
import br.com.dwcore.acadflow_api.export.dto.ExportArtifactResponse;
import br.com.dwcore.acadflow_api.export.dto.ExportStatusResponse;
import br.com.dwcore.acadflow_api.export.service.ExportService;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Tag(name = "Export", description = "Exportação de projetos acadêmicos")
@RestController
@RequiredArgsConstructor
public class ExportController {

    private static final String DOCX_MEDIA_TYPE =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    private final ExportService exportService;

    @GetMapping("/projects/{projectId}/export-status")
    public ResponseEntity<ApiResponse<ExportStatusResponse>> getExportStatus(
            @PathVariable UUID projectId,
            @RequestParam(defaultValue = "pdf") String format,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                exportService.getExportStatus(projectId, format, userDetails.getUsername())));
    }

    @PostMapping("/exports")
    public ResponseEntity<ApiResponse<ExportArtifactResponse>> createExport(
            @Valid @RequestBody CreateExportRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Exportação gerada com sucesso",
                        exportService.createExport(request, userDetails.getUsername())));
    }

    @GetMapping("/exports/download/{projectId}/{fileName}")
    public ResponseEntity<Resource> download(
            @PathVariable UUID projectId,
            @PathVariable String fileName,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw new ResourceNotFoundException("Arquivo não encontrado");
        }
        Resource resource = exportService.loadFile(projectId, fileName, userDetails.getUsername());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(DOCX_MEDIA_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(resource);
    }
}
