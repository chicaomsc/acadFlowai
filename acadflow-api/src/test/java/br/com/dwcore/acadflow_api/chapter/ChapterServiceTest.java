package br.com.dwcore.acadflow_api.chapter;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.dto.UpdateChapterRequest;
import br.com.dwcore.acadflow_api.chapter.dto.UpdateChapterStatusRequest;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.chapter.service.ChapterService;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;

import java.time.LocalDateTime;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.shared.exception.ForbiddenException;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.domain.UserPlan;
import br.com.dwcore.acadflow_api.user.domain.UserRole;
import br.com.dwcore.acadflow_api.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChapterServiceTest {

    @Mock private ChapterRepository chapterRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private UserService userService;

    @InjectMocks
    private ChapterService chapterService;

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

    @Test
    void shouldUpdateContentAndRecalculateWordCount() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);

        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(chapterRepository.save(any(Chapter.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = chapterService.update(chapter.getId(),
                new UpdateChapterRequest("Este é um texto com dez palavras ao todo."),
                user.getEmail());

        assertThat(response.wordCount()).isEqualTo(9);
        assertThat(response.status()).isEqualTo(ChapterStatus.WRITING.name());
    }

    @Test
    void shouldSetStatusToNotStartedWhenContentIsBlank() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        chapter.setContent("algum conteúdo");
        chapter.setStatus(ChapterStatus.WRITING);

        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(chapterRepository.save(any(Chapter.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = chapterService.update(chapter.getId(),
                new UpdateChapterRequest(""), user.getEmail());

        assertThat(response.wordCount()).isZero();
        assertThat(response.status()).isEqualTo(ChapterStatus.NOT_STARTED.name());
    }

    @Test
    void shouldUpdateStatusToReview() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        chapter.setStatus(ChapterStatus.WRITING);

        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(chapterRepository.save(any(Chapter.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = chapterService.updateStatus(chapter.getId(),
                new UpdateChapterStatusRequest(ChapterStatus.REVIEW), user.getEmail());

        assertThat(response.status()).isEqualTo(ChapterStatus.REVIEW.name());
    }

    @Test
    void shouldUpdateStatusToApproved() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        chapter.setStatus(ChapterStatus.REVIEW);

        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(chapterRepository.save(any(Chapter.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = chapterService.updateStatus(chapter.getId(),
                new UpdateChapterStatusRequest(ChapterStatus.APPROVED), user.getEmail());

        assertThat(response.status()).isEqualTo(ChapterStatus.APPROVED.name());
    }

    @Test
    void shouldDenyStatusUpdateWhenUserIsNotOwner() {
        User owner = buildUser("dono@email.com");
        User intruder = buildUser("intruso@email.com");
        Project project = buildProject(owner);
        Chapter chapter = buildChapter(project);

        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        assertThatThrownBy(() -> chapterService.updateStatus(chapter.getId(),
                new UpdateChapterStatusRequest(ChapterStatus.REVIEW), intruder.getEmail()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Acesso negado");
    }

    @Test
    void shouldDenyListWhenProjectBelongsToAnotherUser() {
        User owner = buildUser("dono@email.com");
        User intruder = buildUser("intruso@email.com");
        Project project = buildProject(owner);

        when(userService.findEntityByEmail(intruder.getEmail())).thenReturn(intruder);
        when(projectRepository.findByIdAndUserId(project.getId(), intruder.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> chapterService.findByProjectId(project.getId(), intruder.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    @Test
    void shouldDenyUpdateWhenUserIsNotOwner() {
        User owner = buildUser("dono@email.com");
        User intruder = buildUser("intruso@email.com");
        Project project = buildProject(owner);
        Chapter chapter = buildChapter(project);

        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        assertThatThrownBy(() -> chapterService.update(chapter.getId(),
                new UpdateChapterRequest("conteúdo"), intruder.getEmail()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Acesso negado");
    }

    @Test
    void shouldDenyReadChapterOfDeletedProject() {
        User user = buildUser("aluno@email.com");
        Project deleted = buildDeletedProject(user);
        Chapter chapter = buildChapter(deleted);

        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        assertThatThrownBy(() -> chapterService.findById(chapter.getId(), user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    @Test
    void shouldDenyUpdateChapterOfDeletedProject() {
        User user = buildUser("aluno@email.com");
        Project deleted = buildDeletedProject(user);
        Chapter chapter = buildChapter(deleted);

        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        assertThatThrownBy(() -> chapterService.update(chapter.getId(),
                new UpdateChapterRequest("conteúdo"), user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }
}
