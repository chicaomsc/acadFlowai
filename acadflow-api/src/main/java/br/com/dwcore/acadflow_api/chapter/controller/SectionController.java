package br.com.dwcore.acadflow_api.chapter.controller;

import br.com.dwcore.acadflow_api.chapter.dto.ChapterResponse;
import br.com.dwcore.acadflow_api.chapter.dto.CreateSectionRequest;
import br.com.dwcore.acadflow_api.chapter.dto.UpdateSectionRequest;
import br.com.dwcore.acadflow_api.chapter.service.SectionService;
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

@Tag(name = "Sections", description = "Gerenciamento de seções hierárquicas dos capítulos")
@RestController
@RequiredArgsConstructor
public class SectionController {

    private final SectionService sectionService;

    @PostMapping("/chapters/{chapterId}/sections")
    public ResponseEntity<ApiResponse<ChapterResponse>> createSection(
            @PathVariable UUID chapterId,
            @Valid @RequestBody CreateSectionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ChapterResponse response = sectionService.createSection(chapterId, request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/chapters/{chapterId}/sections")
    public ResponseEntity<ApiResponse<List<ChapterResponse>>> listSections(
            @PathVariable UUID chapterId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                sectionService.findSectionsByChapter(chapterId, userDetails.getUsername())));
    }

    @PatchMapping("/sections/{sectionId}")
    public ResponseEntity<ApiResponse<ChapterResponse>> updateSection(
            @PathVariable UUID sectionId,
            @RequestBody UpdateSectionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                sectionService.updateSection(sectionId, request, userDetails.getUsername())));
    }

    @DeleteMapping("/sections/{sectionId}")
    public ResponseEntity<Void> deleteSection(
            @PathVariable UUID sectionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        sectionService.deleteSection(sectionId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
