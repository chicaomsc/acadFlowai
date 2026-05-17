package br.com.dwcore.acadflow_api.project.controller;

import br.com.dwcore.acadflow_api.project.dto.CreateProjectRequest;
import br.com.dwcore.acadflow_api.project.dto.ProjectDetailResponse;
import br.com.dwcore.acadflow_api.project.dto.ProjectResponse;
import br.com.dwcore.acadflow_api.project.dto.UpdateProjectRequest;
import br.com.dwcore.acadflow_api.project.service.ProjectService;
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

@Tag(name = "Projects", description = "Gerenciamento de projetos acadêmicos")
@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> list(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                projectService.findAll(userDetails.getUsername())));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ApiResponse<ProjectResponse>> findById(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                projectService.findById(projectId, userDetails.getUsername())));
    }

    @GetMapping("/{projectId}/details")
    public ResponseEntity<ApiResponse<ProjectDetailResponse>> findDetail(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                projectService.findDetailById(projectId, userDetails.getUsername())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectDetailResponse>> create(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Projeto criado com sucesso",
                        projectService.create(request, userDetails.getUsername())));
    }

    @PatchMapping("/{projectId}")
    public ResponseEntity<ApiResponse<ProjectDetailResponse>> update(
            @PathVariable UUID projectId,
            @Valid @RequestBody UpdateProjectRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                projectService.update(projectId, request, userDetails.getUsername())));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        projectService.softDelete(projectId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
