package br.com.dwcore.acadflow_api.timeline;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;

import java.time.LocalDateTime;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.shared.exception.ForbiddenException;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.timeline.domain.TaskPriority;
import br.com.dwcore.acadflow_api.timeline.domain.TaskStatus;
import br.com.dwcore.acadflow_api.timeline.domain.TimelineTask;
import br.com.dwcore.acadflow_api.timeline.dto.CreateTaskRequest;
import br.com.dwcore.acadflow_api.timeline.dto.UpdateTaskRequest;
import br.com.dwcore.acadflow_api.timeline.dto.UpdateTaskStatusRequest;
import br.com.dwcore.acadflow_api.timeline.repository.TimelineTaskRepository;
import br.com.dwcore.acadflow_api.timeline.service.TimelineTaskService;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.domain.UserPlan;
import br.com.dwcore.acadflow_api.user.domain.UserRole;
import br.com.dwcore.acadflow_api.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimelineTaskServiceTest {

    @Mock private TimelineTaskRepository taskRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ChapterRepository chapterRepository;
    @Mock private UserService userService;

    @InjectMocks
    private TimelineTaskService taskService;

    private User buildUser(String email) {
        return User.builder().id(UUID.randomUUID()).name("Aluno").email(email)
                .password("hash").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private Project buildProject(User owner) {
        return Project.builder().id(UUID.randomUUID()).user(owner).title("TCC")
                .course("CC").institution("UFBA").norm(AcademicNorm.ABNT)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();
    }

    private Project buildDeletedProject(User owner) {
        return Project.builder().id(UUID.randomUUID()).user(owner).title("TCC")
                .course("CC").institution("UFBA").norm(AcademicNorm.ABNT)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>())
                .deletedAt(LocalDateTime.now()).build();
    }

    private Chapter buildChapter(Project project) {
        return Chapter.builder().id(UUID.randomUUID()).project(project)
                .title("Introdução").type(ChapterType.INTRODUCTION)
                .status(ChapterStatus.NOT_STARTED).orderIndex(1)
                .wordCount(0).targetWordCount(2000).build();
    }

    private TimelineTask buildTask(Project project) {
        return TimelineTask.builder().id(UUID.randomUUID()).project(project)
                .title("Revisar capítulo 1").description("Revisão geral")
                .priority(TaskPriority.HIGH).status(TaskStatus.TODO)
                .orderIndex(0).build();
    }

    @Test
    void shouldCreateTaskWithDefaultStatusTodo() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);

        var request = new CreateTaskRequest(
                project.getId(), null,
                "Escrever introdução", "Rascunho inicial",
                LocalDate.of(2026, 6, 30), TaskPriority.HIGH, 0
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(taskRepository.save(any(TimelineTask.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = taskService.create(request, user.getEmail());

        assertThat(response.title()).isEqualTo("Escrever introdução");
        assertThat(response.status()).isEqualTo(TaskStatus.TODO.name());
        assertThat(response.priority()).isEqualTo(TaskPriority.HIGH.name());
        assertThat(response.chapterId()).isNull();
    }

    @Test
    void shouldUpdateTaskFieldsPartially() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        TimelineTask task = buildTask(project);

        var request = new UpdateTaskRequest(
                null, "Revisar capítulo 1 e 2", null,
                LocalDate.of(2026, 7, 15), TaskPriority.MEDIUM, 1
        );

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(taskRepository.save(any(TimelineTask.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = taskService.update(task.getId(), request, user.getEmail());

        assertThat(response.title()).isEqualTo("Revisar capítulo 1 e 2");
        assertThat(response.priority()).isEqualTo(TaskPriority.MEDIUM.name());
        assertThat(response.orderIndex()).isEqualTo(1);
        assertThat(response.description()).isEqualTo("Revisão geral");
    }

    @Test
    void shouldTransitionStatusToInProgress() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        TimelineTask task = buildTask(project);

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(taskRepository.save(any(TimelineTask.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = taskService.updateStatus(
                task.getId(), new UpdateTaskStatusRequest(TaskStatus.IN_PROGRESS), user.getEmail());

        assertThat(response.status()).isEqualTo(TaskStatus.IN_PROGRESS.name());
    }

    @Test
    void shouldTransitionStatusToDone() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        TimelineTask task = buildTask(project);
        task.setStatus(TaskStatus.IN_PROGRESS);

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(taskRepository.save(any(TimelineTask.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = taskService.updateStatus(
                task.getId(), new UpdateTaskStatusRequest(TaskStatus.DONE), user.getEmail());

        assertThat(response.status()).isEqualTo(TaskStatus.DONE.name());
    }

    @Test
    void shouldDeleteTask() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        TimelineTask task = buildTask(project);

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        taskService.delete(task.getId(), user.getEmail());

        verify(taskRepository).delete(task);
    }

    @Test
    void shouldDenyCreateWhenProjectBelongsToAnotherUser() {
        User user = buildUser("intruso@email.com");
        UUID projectId = UUID.randomUUID();

        var request = new CreateTaskRequest(
                projectId, null, "Tarefa", null,
                null, TaskPriority.LOW, 0
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(projectId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.create(request, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    @Test
    void shouldDenyUpdateWhenUserIsNotOwner() {
        User owner = buildUser("dono@email.com");
        User intruder = buildUser("intruso@email.com");
        Project project = buildProject(owner);
        TimelineTask task = buildTask(project);

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.update(
                task.getId(),
                new UpdateTaskRequest(null, null, null, null, null, null),
                intruder.getEmail()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Acesso negado");
    }

    @Test
    void shouldDenyDeleteWhenUserIsNotOwner() {
        User owner = buildUser("dono@email.com");
        User intruder = buildUser("intruso@email.com");
        Project project = buildProject(owner);
        TimelineTask task = buildTask(project);

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.delete(task.getId(), intruder.getEmail()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Acesso negado");
    }

    @Test
    void shouldDenyUpdateTaskOfDeletedProject() {
        User user = buildUser("aluno@email.com");
        Project deleted = buildDeletedProject(user);
        TimelineTask task = buildTask(deleted);

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.update(
                task.getId(),
                new UpdateTaskRequest(null, null, null, null, null, null),
                user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    @Test
    void shouldRejectChapterFromDifferentProject() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Project otherProject = buildProject(user);
        Chapter chapterFromOtherProject = buildChapter(otherProject);

        var request = new CreateTaskRequest(
                project.getId(), chapterFromOtherProject.getId(),
                "Tarefa", null, null, TaskPriority.MEDIUM, 0
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapterFromOtherProject.getId())).thenReturn(Optional.of(chapterFromOtherProject));

        assertThatThrownBy(() -> taskService.create(request, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Capítulo não encontrado");
    }
}
