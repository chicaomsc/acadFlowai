package br.com.dwcore.acadflow_api.timeline.service;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.shared.exception.ForbiddenException;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.timeline.domain.TaskStatus;
import br.com.dwcore.acadflow_api.timeline.domain.TimelineTask;
import br.com.dwcore.acadflow_api.timeline.dto.CreateTaskRequest;
import br.com.dwcore.acadflow_api.timeline.dto.TaskResponse;
import br.com.dwcore.acadflow_api.timeline.dto.UpdateTaskRequest;
import br.com.dwcore.acadflow_api.timeline.dto.UpdateTaskStatusRequest;
import br.com.dwcore.acadflow_api.timeline.repository.TimelineTaskRepository;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TimelineTaskService {

    private final TimelineTaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ChapterRepository chapterRepository;
    private final UserService userService;

    public List<TaskResponse> findByProjectId(UUID projectId, String userEmail) {
        var user = userService.findEntityByEmail(userEmail);
        projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Projeto não encontrado"));
        return taskRepository.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(projectId)
                .stream().map(TaskResponse::from).toList();
    }

    @Transactional
    public TaskResponse create(CreateTaskRequest request, String userEmail) {
        User user = userService.findEntityByEmail(userEmail);
        Project project = projectRepository.findByIdAndUserId(request.projectId(), user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Projeto não encontrado"));

        Chapter chapter = resolveChapter(request.chapterId(), project.getId());

        TimelineTask task = TimelineTask.builder()
                .project(project)
                .chapter(chapter)
                .title(request.title())
                .description(request.description())
                .dueDate(request.dueDate())
                .priority(request.priority())
                .status(TaskStatus.TODO)
                .orderIndex(request.orderIndex() != null ? request.orderIndex() : 0)
                .build();

        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse update(UUID taskId, UpdateTaskRequest request, String userEmail) {
        TimelineTask task = getTaskOrThrow(taskId);
        verifyOwnership(task, userEmail);

        if (request.chapterId() != null) {
            task.setChapter(resolveChapter(request.chapterId(), task.getProject().getId()));
        }
        if (request.title() != null)       task.setTitle(request.title());
        if (request.description() != null) task.setDescription(request.description());
        if (request.dueDate() != null)     task.setDueDate(request.dueDate());
        if (request.priority() != null)    task.setPriority(request.priority());
        if (request.orderIndex() != null)  task.setOrderIndex(request.orderIndex());

        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse updateStatus(UUID taskId, UpdateTaskStatusRequest request, String userEmail) {
        TimelineTask task = getTaskOrThrow(taskId);
        verifyOwnership(task, userEmail);
        task.setStatus(request.status());
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public void delete(UUID taskId, String userEmail) {
        TimelineTask task = getTaskOrThrow(taskId);
        verifyOwnership(task, userEmail);
        taskRepository.delete(task);
    }

    private Chapter resolveChapter(UUID chapterId, UUID projectId) {
        if (chapterId == null) return null;
        return chapterRepository.findById(chapterId)
                .filter(c -> c.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado"));
    }

    private TimelineTask getTaskOrThrow(UUID id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa não encontrada"));
    }

    private void verifyOwnership(TimelineTask task, String userEmail) {
        if (!task.getProject().getUser().getEmail().equals(userEmail)) {
            throw new ForbiddenException("Acesso negado à tarefa");
        }
        if (task.getProject().getDeletedAt() != null) {
            throw new ResourceNotFoundException("Projeto não encontrado");
        }
    }
}
