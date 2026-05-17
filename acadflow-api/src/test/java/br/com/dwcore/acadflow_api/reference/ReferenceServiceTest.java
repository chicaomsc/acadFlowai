package br.com.dwcore.acadflow_api.reference;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;

import java.time.LocalDateTime;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.reference.domain.Reference;
import br.com.dwcore.acadflow_api.reference.domain.ReferenceType;
import br.com.dwcore.acadflow_api.reference.dto.CreateReferenceRequest;
import br.com.dwcore.acadflow_api.reference.dto.UpdateReferenceRequest;
import br.com.dwcore.acadflow_api.reference.repository.ReferenceRepository;
import br.com.dwcore.acadflow_api.reference.service.ReferenceService;
import br.com.dwcore.acadflow_api.shared.exception.BusinessException;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReferenceServiceTest {

    @Mock private ReferenceRepository referenceRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ChapterRepository chapterRepository;
    @Mock private UserService userService;

    @InjectMocks
    private ReferenceService referenceService;

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

    private Reference buildReference(Project project) {
        return Reference.builder().id(UUID.randomUUID()).project(project)
                .title("Clean Code").authors("MARTIN, R. C.").type(ReferenceType.BOOK)
                .year(2008).publisher("Prentice Hall")
                .abntFormatted("MARTIN, R. C.. Clean Code. Prentice Hall, 2008.")
                .hasCitation(false).build();
    }

    @Test
    void shouldCreateReferenceAndGenerateAbnt() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);

        var request = new CreateReferenceRequest(
                project.getId(), null,
                "Clean Code", "MARTIN, R. C.",
                ReferenceType.BOOK, 2008,
                null, "Prentice Hall", null, null, null, false
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.save(any(Reference.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = referenceService.create(request, user.getEmail());

        assertThat(response.title()).isEqualTo("Clean Code");
        assertThat(response.type()).isEqualTo(ReferenceType.BOOK.name());
        assertThat(response.abntFormatted()).contains("MARTIN, R. C.".toUpperCase());
        assertThat(response.abntFormatted()).contains("Clean Code");
        assertThat(response.abntFormatted()).contains("Prentice Hall");
        assertThat(response.abntFormatted()).contains("2008");
    }

    @Test
    void shouldUpdateFieldsAndRegenerateAbnt() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Reference reference = buildReference(project);

        var request = new UpdateReferenceRequest(
                null, "Clean Code: A Handbook", null,
                null, 2009, null, null, null, null, null, true
        );

        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));
        when(referenceRepository.save(any(Reference.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = referenceService.update(reference.getId(), request, user.getEmail());

        assertThat(response.title()).isEqualTo("Clean Code: A Handbook");
        assertThat(response.year()).isEqualTo(2009);
        assertThat(response.hasCitation()).isTrue();
        assertThat(response.abntFormatted()).contains("2009");
    }

    @Test
    void shouldMarkReferenceAsCited() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Reference reference = buildReference(project);

        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));
        when(referenceRepository.save(any(Reference.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = referenceService.update(
                reference.getId(),
                new UpdateReferenceRequest(null, null, null, null, null, null, null, null, null, null, true),
                user.getEmail());

        assertThat(response.hasCitation()).isTrue();
    }

    @Test
    void shouldUnmarkReferenceAsCited() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Reference reference = buildReference(project);
        reference.setHasCitation(true);

        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));
        when(referenceRepository.save(any(Reference.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = referenceService.update(
                reference.getId(),
                new UpdateReferenceRequest(null, null, null, null, null, null, null, null, null, null, false),
                user.getEmail());

        assertThat(response.hasCitation()).isFalse();
    }

    @Test
    void shouldRejectUpdateWithBlankTitle() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Reference reference = buildReference(project);

        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));

        assertThatThrownBy(() -> referenceService.update(
                reference.getId(),
                new UpdateReferenceRequest(null, "", null, null, null, null, null, null, null, null, null),
                user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Título não pode ser vazio");
    }

    @Test
    void shouldRejectUpdateWithBlankAuthors() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Reference reference = buildReference(project);

        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));

        assertThatThrownBy(() -> referenceService.update(
                reference.getId(),
                new UpdateReferenceRequest(null, null, "   ", null, null, null, null, null, null, null, null),
                user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Autores não podem ser vazios");
    }

    @Test
    void shouldDeleteReference() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Reference reference = buildReference(project);

        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));

        referenceService.delete(reference.getId(), user.getEmail());

        verify(referenceRepository).delete(reference);
    }

    @Test
    void shouldDenyCreateWhenProjectBelongsToAnotherUser() {
        User user = buildUser("intruso@email.com");
        UUID projectId = UUID.randomUUID();

        var request = new CreateReferenceRequest(
                projectId, null, "Título", "Autor",
                ReferenceType.ARTICLE, 2024,
                null, null, null, null, null, false
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(projectId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> referenceService.create(request, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    @Test
    void shouldDenyUpdateWhenUserIsNotOwner() {
        User owner = buildUser("dono@email.com");
        User intruder = buildUser("intruso@email.com");
        Project project = buildProject(owner);
        Reference reference = buildReference(project);

        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));

        assertThatThrownBy(() -> referenceService.update(
                reference.getId(),
                new UpdateReferenceRequest(null, null, null, null, null, null, null, null, null, null, null),
                intruder.getEmail()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Acesso negado");
    }

    @Test
    void shouldDenyDeleteWhenUserIsNotOwner() {
        User owner = buildUser("dono@email.com");
        User intruder = buildUser("intruso@email.com");
        Project project = buildProject(owner);
        Reference reference = buildReference(project);

        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));

        assertThatThrownBy(() -> referenceService.delete(reference.getId(), intruder.getEmail()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Acesso negado");
    }

    @Test
    void shouldDenyUpdateReferenceOfDeletedProject() {
        User user = buildUser("aluno@email.com");
        Project deleted = buildDeletedProject(user);
        Reference reference = buildReference(deleted);

        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));

        assertThatThrownBy(() -> referenceService.update(
                reference.getId(),
                new UpdateReferenceRequest(null, null, null, null, null, null, null, null, null, null, null),
                user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    @Test
    void shouldNotGenerateDoubleDotWhenAuthorsEndsWithPeriod() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);

        var request = new CreateReferenceRequest(
                project.getId(), null,
                "Inteligência Artificial: uma abordagem moderna", "RUSSELL, S.; NORVIG, P.",
                ReferenceType.BOOK, 2022,
                null, null, null, null, null, false
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.save(any(Reference.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = referenceService.create(request, user.getEmail());

        assertThat(response.abntFormatted()).doesNotContain("..");
        assertThat(response.abntFormatted()).startsWith("RUSSELL, S.; NORVIG, P. ");
    }

    @Test
    void shouldPreserveEtAlInLowercaseInAbntFormat() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);

        var request = new CreateReferenceRequest(
                project.getId(), null,
                "Deep Learning Advances", "SILVA, J. et al.",
                ReferenceType.ARTICLE, 2023,
                "Journal of AI", null, null, null, null, false
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.save(any(Reference.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = referenceService.create(request, user.getEmail());

        assertThat(response.abntFormatted()).contains("et al.");
        assertThat(response.abntFormatted()).doesNotContain("ET AL.");
        assertThat(response.abntFormatted()).doesNotContain("..");
    }

    @Test
    void shouldRejectChapterFromDifferentProject() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Project otherProject = buildProject(user);
        Chapter chapterFromOtherProject = buildChapter(otherProject);

        var request = new CreateReferenceRequest(
                project.getId(), chapterFromOtherProject.getId(),
                "Título", "Autor",
                ReferenceType.ARTICLE, 2024,
                null, null, null, null, null, false
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapterFromOtherProject.getId())).thenReturn(Optional.of(chapterFromOtherProject));

        assertThatThrownBy(() -> referenceService.create(request, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Capítulo não encontrado");
    }
}
