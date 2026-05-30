package br.com.dwcore.acadflow_api.academictable.controller;

import br.com.dwcore.acadflow_api.academictable.dto.AcademicTableResponse;
import br.com.dwcore.acadflow_api.academictable.dto.CreateAcademicTableRequest;
import br.com.dwcore.acadflow_api.academictable.dto.UpdateAcademicTableRequest;
import br.com.dwcore.acadflow_api.academictable.service.AcademicTableService;
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

@Tag(name = "Academic Tables", description = "Gerenciamento de tabelas e quadros ABNT")
@RestController
@RequiredArgsConstructor
public class AcademicTableController {

    private final AcademicTableService tableService;

    @PostMapping("/projects/{projectId}/tables")
    public ResponseEntity<ApiResponse<AcademicTableResponse>> create(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateAcademicTableRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        AcademicTableResponse response = tableService.create(projectId, request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/projects/{projectId}/tables")
    public ResponseEntity<ApiResponse<List<AcademicTableResponse>>> listByProject(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<AcademicTableResponse> response = tableService.findByProject(projectId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/chapters/{chapterId}/tables")
    public ResponseEntity<ApiResponse<List<AcademicTableResponse>>> listByChapter(
            @PathVariable UUID chapterId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<AcademicTableResponse> response = tableService.findByChapter(chapterId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/tables/{tableId}")
    public ResponseEntity<ApiResponse<AcademicTableResponse>> update(
            @PathVariable UUID tableId,
            @RequestBody UpdateAcademicTableRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        AcademicTableResponse response = tableService.update(tableId, request, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/tables/{tableId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID tableId,
            @AuthenticationPrincipal UserDetails userDetails) {
        tableService.delete(tableId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
