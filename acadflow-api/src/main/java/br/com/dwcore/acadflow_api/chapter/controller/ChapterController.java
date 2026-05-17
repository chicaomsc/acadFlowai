package br.com.dwcore.acadflow_api.chapter.controller;

import br.com.dwcore.acadflow_api.chapter.dto.ChapterResponse;
import br.com.dwcore.acadflow_api.chapter.dto.UpdateChapterRequest;
import br.com.dwcore.acadflow_api.chapter.dto.UpdateChapterStatusRequest;
import br.com.dwcore.acadflow_api.chapter.service.ChapterService;
import br.com.dwcore.acadflow_api.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Chapters", description = "Gerenciamento de capítulos dos projetos")
@RestController
@RequestMapping("/chapters")
@RequiredArgsConstructor
public class ChapterController {

    private final ChapterService chapterService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ChapterResponse>>> listByProject(
            @RequestParam UUID projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                chapterService.findByProjectId(projectId, userDetails.getUsername())));
    }

    @GetMapping("/{chapterId}")
    public ResponseEntity<ApiResponse<ChapterResponse>> findById(
            @PathVariable UUID chapterId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                chapterService.findById(chapterId, userDetails.getUsername())));
    }

    @PatchMapping("/{chapterId}")
    public ResponseEntity<ApiResponse<ChapterResponse>> update(
            @PathVariable UUID chapterId,
            @RequestBody UpdateChapterRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                chapterService.update(chapterId, request, userDetails.getUsername())));
    }

    @PatchMapping("/{chapterId}/status")
    public ResponseEntity<ApiResponse<ChapterResponse>> updateStatus(
            @PathVariable UUID chapterId,
            @Valid @RequestBody UpdateChapterStatusRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                chapterService.updateStatus(chapterId, request, userDetails.getUsername())));
    }
}
