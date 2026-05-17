package br.com.dwcore.acadflow_api.project;

import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.project.domain.AcademicDegree;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.project.dto.CreateProjectRequest;
import br.com.dwcore.acadflow_api.project.dto.ProjectDetailResponse;
import br.com.dwcore.acadflow_api.project.dto.UpdateProjectRequest;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.project.service.ProjectService;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.domain.UserPlan;
import br.com.dwcore.acadflow_api.user.domain.UserRole;
import br.com.dwcore.acadflow_api.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock private ProjectRepository projectRepository;
    @Mock private ChapterRepository chapterRepository;
    @Mock private UserService userService;

    @InjectMocks
    private ProjectService projectService;

    private User buildUser() {
        return User.builder()
                .id(UUID.randomUUID())
                .name("Aluna").email("aluna@email.com").password("hash")
                .role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    // ---------- create ----------

    @Test
    void shouldCreateProjectWithSixDefaultChapters() {
        User user = buildUser();
        var request = new CreateProjectRequest(
                "Meu TCC", "Ciência da Computação", "UFBA",
                null, AcademicNorm.ABNT, null, null, null, null, null,
                null, null, null, null, null, null, null
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            p = Project.builder()
                    .id(UUID.randomUUID()).user(p.getUser()).title(p.getTitle())
                    .course(p.getCourse()).institution(p.getInstitution())
                    .norm(p.getNorm()).status(ProjectStatus.IN_PROGRESS)
                    .chapters(new ArrayList<>()).build();
            return p;
        });
        when(chapterRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        ProjectDetailResponse response = projectService.create(request, user.getEmail());

        assertThat(response.title()).isEqualTo("Meu TCC");
        assertThat(response.chapters()).hasSize(6);
        assertThat(response.chapters())
                .extracting(ch -> ch.type())
                .containsExactly(
                        ChapterType.INTRODUCTION.name(),
                        ChapterType.THEORETICAL_FOUNDATION.name(),
                        ChapterType.METHODOLOGY.name(),
                        ChapterType.RESULTS.name(),
                        ChapterType.CONCLUSION.name(),
                        ChapterType.REFERENCES.name()
                );
    }

    @Test
    void shouldCreateProjectWithAcademicMetadata() {
        User user = buildUser();
        var request = new CreateProjectRequest(
                "Meu TCC", "Ciência da Computação", "UFBA",
                null, AcademicNorm.ABNT, null, null, null, null, null,
                "Subtítulo do trabalho", AcademicDegree.GRADUACAO,
                "Salvador", 2025,
                "Resumo em português.", "Abstract in English.", "IA, saúde"
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            return Project.builder()
                    .id(UUID.randomUUID()).user(p.getUser()).title(p.getTitle())
                    .course(p.getCourse()).institution(p.getInstitution())
                    .norm(p.getNorm()).status(ProjectStatus.IN_PROGRESS)
                    .subtitle(p.getSubtitle()).academicDegree(p.getAcademicDegree())
                    .defenseCity(p.getDefenseCity()).defenseYear(p.getDefenseYear())
                    .abstractPt(p.getAbstractPt()).abstractEn(p.getAbstractEn())
                    .keywords(p.getKeywords())
                    .chapters(new ArrayList<>()).build();
        });
        when(chapterRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        ProjectDetailResponse response = projectService.create(request, user.getEmail());

        assertThat(response.subtitle()).isEqualTo("Subtítulo do trabalho");
        assertThat(response.academicDegree()).isEqualTo(AcademicDegree.GRADUACAO.name());
        assertThat(response.defenseCity()).isEqualTo("Salvador");
        assertThat(response.defenseYear()).isEqualTo(2025);
        assertThat(response.abstractPt()).isEqualTo("Resumo em português.");
        assertThat(response.abstractEn()).isEqualTo("Abstract in English.");
        assertThat(response.keywords()).isEqualTo("IA, saúde");
    }

    // ---------- ownership ----------

    @Test
    void shouldDenyAccessToAnotherUsersProject() {
        User other = User.builder().id(UUID.randomUUID()).email("outro@email.com")
                .name("Outro").password("h").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
        UUID projectId = UUID.randomUUID();

        when(userService.findEntityByEmail(other.getEmail())).thenReturn(other);
        when(projectRepository.findByIdAndUserId(projectId, other.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.findById(projectId, other.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---------- update ----------

    @Test
    void shouldUpdateProjectFields() {
        User user = buildUser();
        Project project = Project.builder()
                .id(UUID.randomUUID()).user(user).title("Título Antigo")
                .course("Curso").institution("Inst").norm(AcademicNorm.ABNT)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();

        var request = new UpdateProjectRequest(
                "Título Novo", null, null, null, null,
                null, null, null, null, null, null,
                null, null, null, null, null, null, null);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        ProjectDetailResponse response = projectService.update(project.getId(), request, user.getEmail());

        assertThat(response.title()).isEqualTo("Título Novo");
    }

    @Test
    void shouldUpdateAcademicMetadata() {
        User user = buildUser();
        Project project = Project.builder()
                .id(UUID.randomUUID()).user(user).title("TCC")
                .course("CC").institution("UFBA").norm(AcademicNorm.ABNT)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();

        var request = new UpdateProjectRequest(
                null, null, null, null, null,
                null, null, null, null, null, null,
                "Subtítulo atualizado", AcademicDegree.MESTRADO,
                "Recife", 2026,
                "Resumo PT atualizado", null, "IA, machine learning");

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        ProjectDetailResponse response = projectService.update(project.getId(), request, user.getEmail());

        assertThat(response.subtitle()).isEqualTo("Subtítulo atualizado");
        assertThat(response.academicDegree()).isEqualTo(AcademicDegree.MESTRADO.name());
        assertThat(response.defenseCity()).isEqualTo("Recife");
        assertThat(response.defenseYear()).isEqualTo(2026);
        assertThat(response.abstractPt()).isEqualTo("Resumo PT atualizado");
        assertThat(response.abstractEn()).isNull();
        assertThat(response.keywords()).isEqualTo("IA, machine learning");
    }

    @Test
    void shouldDenyUpdateWhenUserIsNotOwner() {
        User user = buildUser();
        UUID projectId = UUID.randomUUID();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(projectId, user.getId())).thenReturn(Optional.empty());

        var request = new UpdateProjectRequest(
                "X", null, null, null, null,
                null, null, null, null, null, null,
                null, null, null, null, null, null, null);

        assertThatThrownBy(() -> projectService.update(projectId, request, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void shouldNotClearAdvisorNameWhenOmitted() {
        User user = buildUser();
        Project project = Project.builder()
                .id(UUID.randomUUID()).user(user).title("TCC")
                .course("Curso").institution("UFBA").advisorName("Prof. Silva")
                .norm(AcademicNorm.ABNT).status(ProjectStatus.IN_PROGRESS)
                .chapters(new ArrayList<>()).build();

        var request = new UpdateProjectRequest(
                "Novo Título", null, null, null, null,
                null, null, null, null, null, null,
                null, null, null, null, null, null, null);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        ProjectDetailResponse response = projectService.update(project.getId(), request, user.getEmail());

        assertThat(response.title()).isEqualTo("Novo Título");
        assertThat(response.advisorName()).isEqualTo("Prof. Silva");
    }

    // ---------- soft delete ----------

    @Test
    void shouldSoftDeleteProject() {
        User user = buildUser();
        Project project = Project.builder()
                .id(UUID.randomUUID()).user(user).title("TCC")
                .course("C").institution("I").norm(AcademicNorm.ABNT)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        projectService.softDelete(project.getId(), user.getEmail());

        ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(captor.capture());
        assertThat(captor.getValue().getDeletedAt()).isNotNull();
    }

    @Test
    void shouldReturnNotFoundForDeletedProject() {
        User user = buildUser();
        UUID projectId = UUID.randomUUID();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(projectId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.findById(projectId, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void shouldDenyDeleteWhenUserIsNotOwner() {
        User user = buildUser();
        UUID projectId = UUID.randomUUID();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(projectId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.softDelete(projectId, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
