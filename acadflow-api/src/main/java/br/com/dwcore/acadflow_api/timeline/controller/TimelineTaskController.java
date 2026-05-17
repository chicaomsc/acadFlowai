package br.com.dwcore.acadflow_api.timeline.controller;

import br.com.dwcore.acadflow_api.shared.response.ApiResponse;
import br.com.dwcore.acadflow_api.timeline.dto.CreateTaskRequest;
import br.com.dwcore.acadflow_api.timeline.dto.TaskResponse;
import br.com.dwcore.acadflow_api.timeline.dto.UpdateTaskRequest;
import br.com.dwcore.acadflow_api.timeline.dto.UpdateTaskStatusRequest;
import br.com.dwcore.acadflow_api.timeline.service.TimelineTaskService;
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

@Tag(name = "Timeline", description = "Gerenciamento de tarefas do cronograma")
@RestController
@RequestMapping("/timeline-tasks")
@RequiredArgsConstructor
public class TimelineTaskController {

    private final TimelineTaskService taskService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskResponse>>> list(
            @RequestParam UUID projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                taskService.findByProjectId(projectId, userDetails.getUsername())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponse>> create(
            @Valid @RequestBody CreateTaskRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tarefa criada com sucesso",
                        taskService.create(request, userDetails.getUsername())));
    }

    @PatchMapping("/{taskId}")
    public ResponseEntity<ApiResponse<TaskResponse>> update(
            @PathVariable UUID taskId,
            @RequestBody UpdateTaskRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                taskService.update(taskId, request, userDetails.getUsername())));
    }

    @PatchMapping("/{taskId}/status")
    public ResponseEntity<ApiResponse<TaskResponse>> updateStatus(
            @PathVariable UUID taskId,
            @Valid @RequestBody UpdateTaskStatusRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                taskService.updateStatus(taskId, request, userDetails.getUsername())));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID taskId,
            @AuthenticationPrincipal UserDetails userDetails) {
        taskService.delete(taskId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
