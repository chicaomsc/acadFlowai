package br.com.dwcore.acadflow_api.project;

import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.export.dto.ExportStatusResponse;
import br.com.dwcore.acadflow_api.export.service.ExportService;
import br.com.dwcore.acadflow_api.project.domain.AcademicDegree;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateType;
import br.com.dwcore.acadflow_api.project.dto.CreateProjectRequest;
import br.com.dwcore.acadflow_api.project.dto.ProjectDetailResponse;
import br.com.dwcore.acadflow_api.project.dto.ProjectResponse;
import br.com.dwcore.acadflow_api.project.dto.UpdateProjectRequest;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.project.service.ProjectService;
import br.com.dwcore.acadflow_api.reference.domain.Reference;
import br.com.dwcore.acadflow_api.reference.domain.ReferenceType;
import br.com.dwcore.acadflow_api.reference.repository.ReferenceRepository;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.timeline.domain.TaskPriority;
import br.com.dwcore.acadflow_api.timeline.domain.TaskStatus;
import br.com.dwcore.acadflow_api.timeline.domain.TimelineTask;
import br.com.dwcore.acadflow_api.timeline.repository.TimelineTaskRepository;
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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock private ProjectRepository projectRepository;
    @Mock private ChapterRepository chapterRepository;
    @Mock private ReferenceRepository referenceRepository;
    @Mock private TimelineTaskRepository timelineTaskRepository;
    @Mock private ExportService exportService;
    @Mock private UserService userService;

    @InjectMocks
    private ProjectService projectService;

    private User buildUser() {
        return User.builder()
                .id(UUID.randomUUID())
                .name("Aluna").email("aluna@email.com").password("hash")
                .role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private ExportStatusResponse stubExportStatus(UUID projectId) {
        return new ExportStatusResponse(projectId, "docx", false, 14,
                List.of("Orientador não informado"), List.of(), 42, 0, 0);
    }

    // ---------- create ----------

    @Test
    void shouldCreateProjectWithSixDefaultChapters() {
        User user = buildUser();
        var request = new CreateProjectRequest(
                "Meu TCC", "Ciência da Computação", "UFBA",
                null, AcademicNorm.ABNT, null, null, null, null, null,
                null, null, null, null, null, null, null, null
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.saveAndFlush(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            p = Project.builder()
                    .id(UUID.randomUUID()).user(p.getUser()).title(p.getTitle())
                    .course(p.getCourse()).institution(p.getInstitution())
                    .norm(p.getNorm()).status(ProjectStatus.IN_PROGRESS)
                    .templateProfile(p.getTemplateProfile())
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                    .chapters(new ArrayList<>()).build();
            return p;
        });
        when(chapterRepository.saveAllAndFlush(anyList())).thenAnswer(inv -> {
            List<br.com.dwcore.acadflow_api.chapter.domain.Chapter> chs = inv.getArgument(0);
            LocalDateTime now = LocalDateTime.now();
            chs.forEach(c -> { c.setCreatedAt(now); c.setUpdatedAt(now); });
            return chs;
        });
        when(exportService.calculateStatus(any(Project.class), anyString()))
                .thenAnswer(inv -> stubExportStatus(((Project) inv.getArgument(0)).getId()));

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
                "Resumo em português.", "Abstract in English.", "IA, saúde", null
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.saveAndFlush(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            return Project.builder()
                    .id(UUID.randomUUID()).user(p.getUser()).title(p.getTitle())
                    .course(p.getCourse()).institution(p.getInstitution())
                    .norm(p.getNorm()).status(ProjectStatus.IN_PROGRESS)
                    .subtitle(p.getSubtitle()).academicDegree(p.getAcademicDegree())
                    .defenseCity(p.getDefenseCity()).defenseYear(p.getDefenseYear())
                    .abstractPt(p.getAbstractPt()).abstractEn(p.getAbstractEn())
                    .keywords(p.getKeywords())
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                    .chapters(new ArrayList<>()).build();
        });
        when(chapterRepository.saveAllAndFlush(anyList())).thenAnswer(inv -> {
            List<br.com.dwcore.acadflow_api.chapter.domain.Chapter> chs = inv.getArgument(0);
            LocalDateTime now = LocalDateTime.now();
            chs.forEach(c -> { c.setCreatedAt(now); c.setUpdatedAt(now); });
            return chs;
        });
        when(exportService.calculateStatus(any(Project.class), anyString()))
                .thenAnswer(inv -> stubExportStatus(((Project) inv.getArgument(0)).getId()));

        ProjectDetailResponse response = projectService.create(request, user.getEmail());

        assertThat(response.subtitle()).isEqualTo("Subtítulo do trabalho");
        assertThat(response.academicDegree()).isEqualTo(AcademicDegree.GRADUACAO.name());
        assertThat(response.defenseCity()).isEqualTo("Salvador");
        assertThat(response.defenseYear()).isEqualTo(2025);
        assertThat(response.abstractPt()).isEqualTo("Resumo em português.");
        assertThat(response.abstractEn()).isEqualTo("Abstract in English.");
        assertThat(response.keywords()).isEqualTo("IA, saúde");
    }

    @Test
    void shouldCreateProjectWithNonNullTimestamps() {
        User user = buildUser();
        var request = new CreateProjectRequest(
                "TCC Timestamps", "CC", "UFBA",
                null, AcademicNorm.ABNT, null, null, null, null, null,
                null, null, null, null, null, null, null, null
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.saveAndFlush(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            p = Project.builder()
                    .id(UUID.randomUUID()).user(p.getUser()).title(p.getTitle())
                    .course(p.getCourse()).institution(p.getInstitution())
                    .norm(p.getNorm()).status(ProjectStatus.IN_PROGRESS)
                    .templateProfile(p.getTemplateProfile())
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                    .chapters(new ArrayList<>()).build();
            return p;
        });
        when(chapterRepository.saveAllAndFlush(anyList())).thenAnswer(inv -> {
            List<br.com.dwcore.acadflow_api.chapter.domain.Chapter> chs = inv.getArgument(0);
            LocalDateTime now = LocalDateTime.now();
            chs.forEach(c -> { c.setCreatedAt(now); c.setUpdatedAt(now); });
            return chs;
        });
        when(exportService.calculateStatus(any(Project.class), anyString()))
                .thenAnswer(inv -> stubExportStatus(((Project) inv.getArgument(0)).getId()));

        ProjectDetailResponse response = projectService.create(request, user.getEmail());

        assertThat(response.createdAt()).isNotNull();
        assertThat(response.updatedAt()).isNotNull();
        assertThat(response.chapters()).allSatisfy(ch -> {
            assertThat(ch.createdAt()).isNotNull();
            assertThat(ch.updatedAt()).isNotNull();
        });
    }

    @Test
    void shouldReturnExportStatusInCreateResponse() {
        User user = buildUser();
        var request = new CreateProjectRequest(
                "TCC Export", "CC", "UFBA",
                null, AcademicNorm.ABNT, null, null, null, null, null,
                null, null, null, null, null, null, null, null
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.saveAndFlush(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            p = Project.builder()
                    .id(UUID.randomUUID()).user(p.getUser()).title(p.getTitle())
                    .course(p.getCourse()).institution(p.getInstitution())
                    .norm(p.getNorm()).status(ProjectStatus.IN_PROGRESS)
                    .templateProfile(p.getTemplateProfile())
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                    .chapters(new ArrayList<>()).build();
            return p;
        });
        when(chapterRepository.saveAllAndFlush(anyList())).thenReturn(List.of());
        when(exportService.calculateStatus(any(Project.class), anyString()))
                .thenReturn(new ExportStatusResponse(null, "docx", false, 33,
                        List.of("Orientador não informado", "Nenhuma referência cadastrada"),
                        List.of("Título preenchido"), 100, 0, 0));

        ProjectDetailResponse response = projectService.create(request, user.getEmail());

        assertThat(response.exportReady()).isFalse();
        assertThat(response.exportProgress()).isEqualTo(33);
        assertThat(response.pendingExportItems()).contains("Orientador não informado");
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
                null, null, null, null, null, null, null, null);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(projectRepository.saveAndFlush(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            p.setUpdatedAt(LocalDateTime.now());
            return p;
        });
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(any())).thenReturn(List.of());
        when(timelineTaskRepository.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(any())).thenReturn(List.of());
        when(exportService.calculateStatus(any(Project.class), anyString()))
                .thenReturn(new ExportStatusResponse(project.getId(), "docx", false, 0,
                        List.of(), List.of(), 0, 0, 0));

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
                "Resumo PT atualizado", null, "IA, machine learning", null);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(projectRepository.saveAndFlush(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            p.setUpdatedAt(LocalDateTime.now());
            return p;
        });
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(any())).thenReturn(List.of());
        when(timelineTaskRepository.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(any())).thenReturn(List.of());
        when(exportService.calculateStatus(any(Project.class), anyString()))
                .thenReturn(new ExportStatusResponse(project.getId(), "docx", false, 0,
                        List.of(), List.of(), 0, 0, 0));

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
                null, null, null, null, null, null, null, null);

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
                null, null, null, null, null, null, null, null);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(projectRepository.saveAndFlush(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            p.setUpdatedAt(LocalDateTime.now());
            return p;
        });
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(any())).thenReturn(List.of());
        when(timelineTaskRepository.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(any())).thenReturn(List.of());
        when(exportService.calculateStatus(any(Project.class), anyString()))
                .thenReturn(new ExportStatusResponse(project.getId(), "docx", false, 0,
                        List.of(), List.of(), 0, 0, 0));

        ProjectDetailResponse response = projectService.update(project.getId(), request, user.getEmail());

        assertThat(response.title()).isEqualTo("Novo Título");
        assertThat(response.advisorName()).isEqualTo("Prof. Silva");
    }

    @Test
    void shouldReturnExportStatusInUpdateResponse() {
        User user = buildUser();
        Project project = Project.builder()
                .id(UUID.randomUUID()).user(user).title("TCC")
                .course("CC").institution("UFBA").advisorName("Prof. Silva")
                .defenseCity("Salvador").defenseYear(2025)
                .abstractPt("Resumo.").norm(AcademicNorm.ABNT)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();

        var request = new UpdateProjectRequest(
                null, null, null, null, null,
                null, null, null, null, null, null,
                null, null, null, null, null, null, null, null);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(projectRepository.saveAndFlush(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            p.setUpdatedAt(LocalDateTime.now());
            return p;
        });
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(any())).thenReturn(List.of());
        when(timelineTaskRepository.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(any())).thenReturn(List.of());
        when(exportService.calculateStatus(any(Project.class), anyString()))
                .thenReturn(new ExportStatusResponse(project.getId(), "docx", false, 33,
                        List.of("Nenhuma referência cadastrada"), List.of("Metadados OK"), 100, 0, 0));

        ProjectDetailResponse response = projectService.update(project.getId(), request, user.getEmail());

        assertThat(response.exportReady()).isFalse();
        assertThat(response.exportProgress()).isEqualTo(33);
        assertThat(response.pendingExportItems()).contains("Nenhuma referência cadastrada");
        assertThat(response.updatedAt()).isNotNull();
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

    // ---------- findDetailById — aggregated data ----------

    private Project buildProject(User owner) {
        return Project.builder().id(UUID.randomUUID()).user(owner).title("TCC")
                .course("CC").institution("UFBA").norm(AcademicNorm.ABNT)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();
    }

    private Reference buildReference(Project project, boolean hasCitation) {
        return Reference.builder().id(UUID.randomUUID()).project(project)
                .title("Ref Title").authors("AUTHOR, A.")
                .type(ReferenceType.BOOK).year(2024)
                .abntFormatted("AUTHOR, A.. Ref Title. 2024.")
                .hasCitation(hasCitation).build();
    }

    private TimelineTask buildTask(Project project, TaskStatus status) {
        return TimelineTask.builder().id(UUID.randomUUID()).project(project)
                .title("Task").priority(TaskPriority.MEDIUM)
                .status(status).orderIndex(1).build();
    }

    private ExportStatusResponse readyExportStatus(Project project) {
        return new ExportStatusResponse(project.getId(), "docx", true, 100,
                List.of(), List.of("Tudo pronto"), 100, 100, 100);
    }

    private ExportStatusResponse pendingExportStatus(Project project) {
        return new ExportStatusResponse(project.getId(), "docx", false, 42,
                List.of("Orientador não informado"), List.of(), 42, 100, 100);
    }

    @Test
    void shouldReturnRealReferencesInProjectDetail() {
        User user = buildUser();
        Project project = buildProject(user);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true), buildReference(project, false)));
        when(timelineTaskRepository.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(project.getId()))
                .thenReturn(List.of());
        when(exportService.calculateStatus(project, "docx")).thenReturn(readyExportStatus(project));

        ProjectDetailResponse detail = projectService.findDetailById(project.getId(), user.getEmail());

        assertThat(detail.totalReferences()).isEqualTo(2);
        assertThat(detail.citedReferences()).isEqualTo(1);
        assertThat(detail.pendingReferences()).isEqualTo(1);
        assertThat(detail.references()).hasSize(2);
    }

    @Test
    void shouldReturnRealTasksInProjectDetail() {
        User user = buildUser();
        Project project = buildProject(user);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId())).thenReturn(List.of());
        when(timelineTaskRepository.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(project.getId()))
                .thenReturn(List.of(
                        buildTask(project, TaskStatus.DONE),
                        buildTask(project, TaskStatus.DONE),
                        buildTask(project, TaskStatus.TODO)));
        when(exportService.calculateStatus(project, "docx")).thenReturn(readyExportStatus(project));

        ProjectDetailResponse detail = projectService.findDetailById(project.getId(), user.getEmail());

        assertThat(detail.totalTasks()).isEqualTo(3);
        assertThat(detail.completedTasks()).isEqualTo(2);
        assertThat(detail.pendingTasks()).isEqualTo(1);
        assertThat(detail.timelineTasks()).hasSize(3);
    }

    @Test
    void shouldReturnZeroCountersWhenProjectHasNoReferencesOrTasks() {
        User user = buildUser();
        Project project = buildProject(user);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId())).thenReturn(List.of());
        when(timelineTaskRepository.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(project.getId())).thenReturn(List.of());
        when(exportService.calculateStatus(project, "docx")).thenReturn(readyExportStatus(project));

        ProjectDetailResponse detail = projectService.findDetailById(project.getId(), user.getEmail());

        assertThat(detail.totalReferences()).isZero();
        assertThat(detail.citedReferences()).isZero();
        assertThat(detail.pendingReferences()).isZero();
        assertThat(detail.references()).isEmpty();
        assertThat(detail.totalTasks()).isZero();
        assertThat(detail.completedTasks()).isZero();
        assertThat(detail.pendingTasks()).isZero();
        assertThat(detail.timelineTasks()).isEmpty();
    }

    @Test
    void shouldReturnExportReadyStatusInProjectDetail() {
        User user = buildUser();
        Project project = buildProject(user);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId())).thenReturn(List.of());
        when(timelineTaskRepository.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(project.getId())).thenReturn(List.of());
        when(exportService.calculateStatus(project, "docx")).thenReturn(readyExportStatus(project));

        ProjectDetailResponse detail = projectService.findDetailById(project.getId(), user.getEmail());

        assertThat(detail.exportReady()).isTrue();
        assertThat(detail.exportProgress()).isEqualTo(100);
        assertThat(detail.pendingExportItems()).isEmpty();
    }

    @Test
    void shouldReturnPendingExportItemsWhenProjectIsIncomplete() {
        User user = buildUser();
        Project project = buildProject(user);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId())).thenReturn(List.of());
        when(timelineTaskRepository.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(project.getId())).thenReturn(List.of());
        when(exportService.calculateStatus(project, "docx")).thenReturn(pendingExportStatus(project));

        ProjectDetailResponse detail = projectService.findDetailById(project.getId(), user.getEmail());

        assertThat(detail.exportReady()).isFalse();
        assertThat(detail.exportProgress()).isEqualTo(42);
        assertThat(detail.pendingExportItems()).contains("Orientador não informado");
    }

    @Test
    void shouldDenyDetailAccessForAnotherUsersProject() {
        User intruder = buildUser();
        UUID projectId = UUID.randomUUID();

        when(userService.findEntityByEmail(intruder.getEmail())).thenReturn(intruder);
        when(projectRepository.findByIdAndUserId(projectId, intruder.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.findDetailById(projectId, intruder.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    @Test
    void shouldReturnNotFoundForDeletedProjectInDetail() {
        User user = buildUser();
        UUID projectId = UUID.randomUUID();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        // findByIdAndUserId excludes soft-deleted projects (deletedAt IS NULL in query)
        when(projectRepository.findByIdAndUserId(projectId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.findDetailById(projectId, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    // ---------- templateProfile ----------

    @Test
    void shouldCreateProjectWithFemafTemplate() {
        User user = buildUser();
        var request = new CreateProjectRequest(
                "TCC FEMAF", "Direito", "FEMAF",
                null, AcademicNorm.ABNT, null, null, null, null, null,
                null, null, null, null, null, null, null, AcademicTemplateType.FEMAF
        );

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.saveAndFlush(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            return Project.builder()
                    .id(UUID.randomUUID()).user(p.getUser()).title(p.getTitle())
                    .course(p.getCourse()).institution(p.getInstitution())
                    .norm(p.getNorm()).status(ProjectStatus.IN_PROGRESS)
                    .templateProfile(p.getTemplateProfile())
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                    .chapters(new ArrayList<>()).build();
        });
        when(chapterRepository.saveAllAndFlush(anyList())).thenReturn(List.of());
        when(exportService.calculateStatus(any(Project.class), anyString()))
                .thenAnswer(inv -> stubExportStatus(((Project) inv.getArgument(0)).getId()));

        ProjectDetailResponse response = projectService.create(request, user.getEmail());

        assertThat(response.templateProfile()).isEqualTo("FEMAF");
    }

    @Test
    void shouldUpdateTemplateProfileToFemaf() {
        User user = buildUser();
        Project project = Project.builder()
                .id(UUID.randomUUID()).user(user).title("TCC")
                .course("Direito").institution("FEMAF").norm(AcademicNorm.ABNT)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();

        var request = new UpdateProjectRequest(
                null, null, null, null, null,
                null, null, null, null, null, null,
                null, null, null, null, null, null, null, AcademicTemplateType.FEMAF);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(projectRepository.saveAndFlush(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            p.setUpdatedAt(LocalDateTime.now());
            return p;
        });
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(any())).thenReturn(List.of());
        when(timelineTaskRepository.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(any())).thenReturn(List.of());
        when(exportService.calculateStatus(any(Project.class), anyString()))
                .thenReturn(new ExportStatusResponse(project.getId(), "docx", false, 0,
                        List.of(), List.of(), 0, 0, 0));

        ProjectDetailResponse response = projectService.update(project.getId(), request, user.getEmail());

        assertThat(response.templateProfile()).isEqualTo("FEMAF");
    }

    @Test
    void shouldUpdateTemplateProfileToAbntGeneric() {
        User user = buildUser();
        Project project = Project.builder()
                .id(UUID.randomUUID()).user(user).title("TCC")
                .course("Direito").institution("FEMAF").norm(AcademicNorm.ABNT)
                .templateProfile(AcademicTemplateType.FEMAF)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();

        var request = new UpdateProjectRequest(
                null, null, null, null, null,
                null, null, null, null, null, null,
                null, null, null, null, null, null, null, AcademicTemplateType.ABNT_GENERIC);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(projectRepository.saveAndFlush(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            p.setUpdatedAt(LocalDateTime.now());
            return p;
        });
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(any())).thenReturn(List.of());
        when(timelineTaskRepository.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(any())).thenReturn(List.of());
        when(exportService.calculateStatus(any(Project.class), anyString()))
                .thenReturn(new ExportStatusResponse(project.getId(), "docx", false, 0,
                        List.of(), List.of(), 0, 0, 0));

        ProjectDetailResponse response = projectService.update(project.getId(), request, user.getEmail());

        assertThat(response.templateProfile()).isEqualTo("ABNT_GENERIC");
    }

    @Test
    void shouldReturnTemplateProfileInFindAll() {
        User user = buildUser();
        Project project = Project.builder()
                .id(UUID.randomUUID()).user(user).title("TCC")
                .course("Direito").institution("FEMAF").norm(AcademicNorm.ABNT)
                .templateProfile(AcademicTemplateType.FEMAF)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByUserIdOrderByCreatedAtDesc(user.getId()))
                .thenReturn(List.of(project));

        List<ProjectResponse> responses = projectService.findAll(user.getEmail());

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).templateProfile()).isEqualTo("FEMAF");
    }

    @Test
    void shouldReturnTemplateProfileInFindById() {
        User user = buildUser();
        Project project = Project.builder()
                .id(UUID.randomUUID()).user(user).title("TCC")
                .course("Direito").institution("FEMAF").norm(AcademicNorm.ABNT)
                .templateProfile(AcademicTemplateType.FEMAF)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));

        ProjectResponse response = projectService.findById(project.getId(), user.getEmail());

        assertThat(response.templateProfile()).isEqualTo("FEMAF");
    }
}
