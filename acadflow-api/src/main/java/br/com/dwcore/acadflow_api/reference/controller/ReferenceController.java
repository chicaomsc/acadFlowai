package br.com.dwcore.acadflow_api.reference.controller;

import br.com.dwcore.acadflow_api.reference.dto.CreateReferenceRequest;
import br.com.dwcore.acadflow_api.reference.dto.ReferenceResponse;
import br.com.dwcore.acadflow_api.reference.dto.UpdateReferenceRequest;
import br.com.dwcore.acadflow_api.reference.service.ReferenceService;
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

@Tag(name = "References", description = "Gerenciamento de referências acadêmicas")
@RestController
@RequestMapping("/references")
@RequiredArgsConstructor
public class ReferenceController {

    private final ReferenceService referenceService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReferenceResponse>>> list(
            @RequestParam UUID projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                referenceService.findByProjectId(projectId, userDetails.getUsername())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ReferenceResponse>> create(
            @Valid @RequestBody CreateReferenceRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Referência criada com sucesso",
                        referenceService.create(request, userDetails.getUsername())));
    }

    @PatchMapping("/{referenceId}")
    public ResponseEntity<ApiResponse<ReferenceResponse>> update(
            @PathVariable UUID referenceId,
            @RequestBody UpdateReferenceRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                referenceService.update(referenceId, request, userDetails.getUsername())));
    }

    @DeleteMapping("/{referenceId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID referenceId,
            @AuthenticationPrincipal UserDetails userDetails) {
        referenceService.delete(referenceId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
