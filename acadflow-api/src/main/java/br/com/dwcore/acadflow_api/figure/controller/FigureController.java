package br.com.dwcore.acadflow_api.figure.controller;

import br.com.dwcore.acadflow_api.figure.dto.FigureResponse;
import br.com.dwcore.acadflow_api.figure.service.FigureService;
import br.com.dwcore.acadflow_api.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Tag(name = "Figures", description = "Gerenciamento de figuras ABNT")
@RestController
@RequiredArgsConstructor
public class FigureController {

    private final FigureService figureService;

    @PostMapping(value = "/projects/{projectId}/figures", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FigureResponse>> upload(
            @PathVariable UUID projectId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("chapterId") UUID chapterId,
            @RequestParam("caption") String caption,
            @RequestParam(value = "sourceText", required = false) String sourceText,
            @RequestParam(value = "widthPercent", required = false) Integer widthPercent,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException {
        FigureResponse response = figureService.create(
                projectId, chapterId, file, caption, sourceText, widthPercent,
                userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/projects/{projectId}/figures")
    public ResponseEntity<ApiResponse<List<FigureResponse>>> listByProject(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<FigureResponse> response = figureService.findByProject(projectId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/chapters/{chapterId}/figures")
    public ResponseEntity<ApiResponse<List<FigureResponse>>> listByChapter(
            @PathVariable UUID chapterId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<FigureResponse> response = figureService.findByChapter(chapterId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/projects/{projectId}/figures/{figureId}/image")
    public ResponseEntity<byte[]> getImage(
            @PathVariable UUID projectId,
            @PathVariable UUID figureId,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException {
        FigureService.ImageData imageData = figureService.loadImage(projectId, figureId, userDetails.getUsername());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(imageData.mimeType()));
        headers.setContentLength(imageData.bytes().length);
        return ResponseEntity.ok().headers(headers).body(imageData.bytes());
    }

    @DeleteMapping("/figures/{figureId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID figureId,
            @AuthenticationPrincipal UserDetails userDetails) {
        figureService.delete(figureId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
