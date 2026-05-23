package br.com.dwcore.acadflow_api.citation.controller;

import br.com.dwcore.acadflow_api.citation.dto.CitationResponse;
import br.com.dwcore.acadflow_api.citation.dto.CreateCitationRequest;
import br.com.dwcore.acadflow_api.citation.service.CitationService;
import br.com.dwcore.acadflow_api.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Citations", description = "Gerenciamento de citações ABNT")
@RestController
@RequiredArgsConstructor
public class CitationController {

    private final CitationService citationService;

    @PostMapping("/chapters/{chapterId}/citations")
    public ResponseEntity<ApiResponse<CitationResponse>> create(
            @PathVariable UUID chapterId,
            @Valid @RequestBody CreateCitationRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        CitationResponse response = citationService.create(chapterId, request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/chapters/{chapterId}/citations")
    public ResponseEntity<ApiResponse<List<CitationResponse>>> listByChapter(
            @PathVariable UUID chapterId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<CitationResponse> response = citationService.findByChapterId(chapterId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/projects/{projectId}/citations")
    public ResponseEntity<ApiResponse<List<CitationResponse>>> listByProject(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<CitationResponse> response = citationService.findByProjectId(projectId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/citations/{citationId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID citationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        citationService.delete(citationId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
