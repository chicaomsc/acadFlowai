package br.com.dwcore.acadflow_api.chapter.controller;

import br.com.dwcore.acadflow_api.chapter.dto.DocumentStructureResponse;
import br.com.dwcore.acadflow_api.chapter.service.DocumentStructureService;
import br.com.dwcore.acadflow_api.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Tag(name = "Document Structure", description = "Navegação hierárquica do documento acadêmico")
@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class DocumentStructureController {

    private final DocumentStructureService documentStructureService;

    @GetMapping("/{projectId}/document-structure")
    public ResponseEntity<ApiResponse<DocumentStructureResponse>> getDocumentStructure(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                documentStructureService.getDocumentStructure(projectId, userDetails.getUsername())));
    }
}
