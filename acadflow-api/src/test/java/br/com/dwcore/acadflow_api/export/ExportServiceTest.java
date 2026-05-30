package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.citation.domain.CitationDisplayMode;
import br.com.dwcore.acadflow_api.citation.domain.CitationType;
import br.com.dwcore.acadflow_api.citation.repository.CitationRepository;
import br.com.dwcore.acadflow_api.academictable.repository.AcademicTableRepository;
import br.com.dwcore.acadflow_api.export.docx.DocxBuilder;
import br.com.dwcore.acadflow_api.export.dto.CreateExportRequest;
import br.com.dwcore.acadflow_api.export.service.ExportService;
import br.com.dwcore.acadflow_api.figure.domain.Figure;
import br.com.dwcore.acadflow_api.figure.repository.FigureRepository;
import br.com.dwcore.acadflow_api.figure.service.FigureStorageService;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.reference.domain.Reference;
import br.com.dwcore.acadflow_api.reference.domain.ReferenceType;
import br.com.dwcore.acadflow_api.reference.repository.ReferenceRepository;
import br.com.dwcore.acadflow_api.shared.exception.BusinessException;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.domain.UserPlan;
import br.com.dwcore.acadflow_api.user.domain.UserRole;
import br.com.dwcore.acadflow_api.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExportServiceTest {

    @TempDir
    Path tempDir;

    @Mock private ProjectRepository projectRepository;
    @Mock private ChapterRepository chapterRepository;
    @Mock private ReferenceRepository referenceRepository;
    @Mock private CitationRepository citationRepository;
    @Mock private FigureRepository figureRepository;
    @Mock private FigureStorageService figureStorageService;
    @Mock private AcademicTableRepository tableRepository;
    @Mock private UserService userService;
    @Mock private DocxBuilder docxBuilder;

    @InjectMocks
    private ExportService exportService;

    @BeforeEach
    void setExportDir() {
        ReflectionTestUtils.setField(exportService, "exportDir", tempDir.toString());
        lenient().when(tableRepository.findByProjectIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
    }

    private User buildUser(String email) {
        return User.builder().id(UUID.randomUUID()).name("Aluno").email(email)
                .password("hash").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private Project buildProject(User owner) {
        return Project.builder().id(UUID.randomUUID()).user(owner)
                .title("Impacto da IA no Ensino Superior")
                .course("CC").institution("UFBA").norm(AcademicNorm.ABNT)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();
    }

    private Project buildReadyProject(User owner) {
        return Project.builder().id(UUID.randomUUID()).user(owner)
                .title("Impacto da IA no Ensino Superior")
                .course("CC").institution("UFBA").norm(AcademicNorm.ABNT)
                .advisorName("Prof. Silva")
                .defenseCity("Salvador").defenseYear(2025)
                .abstractPt("Resumo do trabalho em português.")
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();
    }

    private Chapter buildChapter(Project project, String content) {
        return buildChapter(project, ChapterType.INTRODUCTION, "Introdução", content);
    }

    private Chapter buildChapter(Project project, ChapterType type, String title, String content) {
        return Chapter.builder().id(UUID.randomUUID()).project(project)
                .title(title).type(type)
                .status(content != null && !content.isBlank() ? ChapterStatus.WRITING : ChapterStatus.NOT_STARTED)
                .orderIndex(1).wordCount(0).targetWordCount(2000)
                .content(content).build();
    }

    private List<Chapter> buildRequiredChapters(Project project) {
        return List.of(
                buildChapter(project, ChapterType.INTRODUCTION, "Introdução", "Conteúdo da introdução."),
                buildChapter(project, ChapterType.THEORETICAL_FOUNDATION, "Fundamentação Teórica", "Conteúdo da fundamentação."),
                buildChapter(project, ChapterType.METHODOLOGY, "Metodologia", "Conteúdo da metodologia."),
                buildChapter(project, ChapterType.RESULTS, "Resultados", "Conteúdo dos resultados."),
                buildChapter(project, ChapterType.CONCLUSION, "Conclusão", "Conteúdo da conclusão.")
        );
    }

    private Reference buildReference(Project project, boolean hasCitation) {
        return Reference.builder().id(UUID.randomUUID()).project(project)
                .title("Clean Code").authors("MARTIN, R. C.")
                .type(ReferenceType.BOOK).year(2008)
                .abntFormatted("MARTIN, R. C.. Clean Code. 2008.")
                .hasCitation(hasCitation).build();
    }

    private void mockOwnership(User user, Project project) {
        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
    }

    @Test
    void shouldReturnStatusWithPendingItemsWhenChaptersLackContent() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);

        mockOwnership(user, project);
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(List.of(
                        buildChapter(project, ChapterType.INTRODUCTION, "Introdução", null),
                        buildChapter(project, ChapterType.METHODOLOGY, "Metodologia", null)));
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of());
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        var status = exportService.getExportStatus(project.getId(), "pdf", user.getEmail());

        assertThat(status.ready()).isFalse();
        assertThat(status.pendingItems()).hasSize(3); // 2 chapter items + 1 reference item
        assertThat(status.pendingItems()).anyMatch(s -> s.contains("sem conteúdo"));
        assertThat(status.pendingItems()).anyMatch(s -> s.contains("referência"));
        assertThat(status.chapterCoverage()).isZero();
        assertThat(status.referenceCoverage()).isZero();
    }

    @Test
    void shouldReturnReadyStatusWhenAllRequirementsAreMet() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);

        mockOwnership(user, project);
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(buildRequiredChapters(project));
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        var status = exportService.getExportStatus(project.getId(), "pdf", user.getEmail());

        assertThat(status.ready()).isTrue();
        assertThat(status.pendingItems()).isEmpty();
        assertThat(status.completedItems()).isNotEmpty();
        assertThat(status.metadataCoverage()).isEqualTo(100);
        assertThat(status.chapterCoverage()).isEqualTo(100);
        assertThat(status.referenceCoverage()).isEqualTo(100);
        assertThat(status.progress()).isEqualTo(100);
    }

    @Test
    void shouldBlockExportWhenProjectHasPendingItems() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user); // missing metadata — project has pending items

        mockOwnership(user, project);
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(List.of(buildChapter(project, null)));
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of());
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        assertThatThrownBy(() -> exportService.createExport(
                new CreateExportRequest(project.getId(), "pdf"), user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("pendências");
    }

    @Test
    void shouldGenerateDocxArtifactWhenProjectIsReady() throws Exception {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);

        mockOwnership(user, project);
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(buildRequiredChapters(project));
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());
        when(docxBuilder.build(any(), any(), any(), any(), any(), any())).thenReturn(new byte[]{1, 2, 3});

        var artifact = exportService.createExport(
                new CreateExportRequest(project.getId(), "docx"), user.getEmail());

        assertThat(artifact.fileName()).endsWith(".docx");
        assertThat(artifact.fileName()).doesNotContain(" ");
        assertThat(artifact.downloadUrl()).startsWith("/exports/download/");
        assertThat(artifact.downloadUrl()).contains(project.getId().toString());
        assertThat(artifact.format()).isEqualTo("docx");
        assertThat(artifact.generatedAt()).isNotNull();
    }

    @Test
    void shouldRejectPdfFormatInExport() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);

        mockOwnership(user, project);
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(buildRequiredChapters(project));
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        assertThatThrownBy(() -> exportService.createExport(
                new CreateExportRequest(project.getId(), "pdf"), user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("DOCX");
    }

    @Test
    void shouldRejectSlidesFormatInExport() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);

        mockOwnership(user, project);
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(buildRequiredChapters(project));
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        assertThatThrownBy(() -> exportService.createExport(
                new CreateExportRequest(project.getId(), "slides"), user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("DOCX");
    }

    @Test
    void shouldNormalizeAccentedCharsInFileName() throws Exception {
        User user = buildUser("aluno@email.com");
        Project project = Project.builder().id(UUID.randomUUID()).user(user)
                .title("Impacto da Inteligência Artificial no Ensino Superior")
                .course("CC").institution("UFBA").norm(AcademicNorm.ABNT)
                .advisorName("Prof. Silva").defenseCity("Salvador").defenseYear(2025)
                .abstractPt("Resumo do trabalho.")
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();

        mockOwnership(user, project);
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(buildRequiredChapters(project));
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());
        when(docxBuilder.build(any(), any(), any(), any(), any(), any())).thenReturn(new byte[]{1, 2, 3});

        var artifact = exportService.createExport(
                new CreateExportRequest(project.getId(), "docx"), user.getEmail());

        assertThat(artifact.fileName()).contains("inteligencia");
        assertThat(artifact.fileName()).doesNotContain("inteligncia");
        assertThat(artifact.fileName()).doesNotContain("ê");
    }

    @Test
    void shouldDenyExportForAnotherUsersProject() {
        User intruder = buildUser("intruso@email.com");
        UUID projectId = UUID.randomUUID();

        when(userService.findEntityByEmail(intruder.getEmail())).thenReturn(intruder);
        when(projectRepository.findByIdAndUserId(projectId, intruder.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> exportService.getExportStatus(projectId, "pdf", intruder.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    @Test
    void shouldCalculatePartialCoverageCorrectly() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);

        mockOwnership(user, project);
        // 2 of 4 required chapters have content → 50% chapter coverage
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(List.of(
                        buildChapter(project, ChapterType.INTRODUCTION, "Introdução", "Conteúdo"),
                        buildChapter(project, ChapterType.THEORETICAL_FOUNDATION, "Fundamentação", "Conteúdo"),
                        buildChapter(project, ChapterType.METHODOLOGY, "Metodologia", null),
                        buildChapter(project, ChapterType.RESULTS, "Resultados", null)));
        // 1 of 2 references has citation → 50% reference coverage
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(
                        buildReference(project, true),
                        buildReference(project, false)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isFalse();
        assertThat(status.metadataCoverage()).isEqualTo(100);
        assertThat(status.chapterCoverage()).isEqualTo(50);
        assertThat(status.referenceCoverage()).isEqualTo(50);
        assertThat(status.progress()).isEqualTo(66); // (100+50+50)/3
    }

    @Test
    void shouldReportMissingMetadataInPendingItems() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user); // missing advisorName, defenseCity, defenseYear, abstractPt

        mockOwnership(user, project);
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(buildRequiredChapters(project));
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        var status = exportService.getExportStatus(project.getId(), "pdf", user.getEmail());

        assertThat(status.ready()).isFalse();
        assertThat(status.pendingItems()).anyMatch(s -> s.equals("Orientador não informado"));
        assertThat(status.pendingItems()).anyMatch(s -> s.equals("Cidade de defesa não informada"));
        assertThat(status.pendingItems()).anyMatch(s -> s.equals("Ano de defesa não informado"));
        assertThat(status.pendingItems()).anyMatch(s -> s.equals("Resumo em português não preenchido"));
        assertThat(status.metadataCoverage()).isEqualTo(42); // 3/7 * 100 = 42 (floor)
    }

    @Test
    void shouldNotRequireContentForNonTextualChapters() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);

        mockOwnership(user, project);
        // All 5 required textual chapters have content; REFERENCES chapter has none
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        chapters.add(buildChapter(project, ChapterType.REFERENCES, "Referências", null));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        var status = exportService.getExportStatus(project.getId(), "pdf", user.getEmail());

        assertThat(status.ready()).isTrue();
        assertThat(status.chapterCoverage()).isEqualTo(100);
    }

    @Test
    void shouldBlockExportWhenChapterHasOrphanCitationMarker() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID orphanId = UUID.randomUUID();

        mockOwnership(user, project);
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String withOrphan = "Texto com marcador [[@CITE:" + orphanId + "]] inválido.";
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", withOrphan));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isFalse();
        assertThat(status.pendingItems()).anyMatch(s -> s.contains("citação inválida"));
    }

    @Test
    void shouldNotBlockWhenAllCitationMarkersAreKnown() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID knownId = UUID.randomUUID();

        mockOwnership(user, project);
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String withKnown = "Texto com citação [[@CITE:" + knownId + "]] válida.";
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", withKnown));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));

        Citation knownCitation = Citation.builder()
                .id(knownId).type(CitationType.INDIRECT)
                .displayMode(CitationDisplayMode.PARENTHETICAL).build();
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of(knownCitation));
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isTrue();
        assertThat(status.pendingItems()).noneMatch(s -> s.contains("citação inválida"));
    }

    @Test
    void shouldBlockExportWhenChapterHasOrphanFigureMarker() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID orphanFigId = UUID.randomUUID();

        mockOwnership(user, project);
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String withOrphanFig = "Texto com figura inválida [[@FIG:" + orphanFigId + "]] aqui.";
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", withOrphanFig));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        // figureRepository returns empty — orphan marker not resolved
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isFalse();
        assertThat(status.pendingItems()).anyMatch(s -> s.contains("figura inválida"));
    }

    @Test
    void shouldNotBlockWhenAllFigureMarkersAreKnown() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID knownFigId = UUID.randomUUID();

        mockOwnership(user, project);
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String withKnownFig = "Texto com figura válida [[@FIG:" + knownFigId + "]].";
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", withKnownFig));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());

        Figure knownFigure = Figure.builder()
                .id(knownFigId).caption("Figura válida").mimeType("image/png")
                .storageKey("proj/fig.png").fileSizeBytes(100L).widthPercent(100).build();
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId()))
                .thenReturn(List.of(knownFigure));
        when(figureStorageService.exists(knownFigure.getStorageKey())).thenReturn(true);

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isTrue();
        assertThat(status.pendingItems()).noneMatch(s -> s.contains("figura inválida"));
        assertThat(status.pendingItems()).noneMatch(s -> s.contains("arquivo disponível"));
    }

    @Test
    void shouldBlockExportStatusWhenFigureFileMissingFromStorage() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID figId = UUID.randomUUID();

        mockOwnership(user, project);
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String withFigMarker = "Texto com figura [[@FIG:" + figId + "]].";
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", withFigMarker));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());

        Figure fig = Figure.builder()
                .id(figId).caption("Diagrama sem arquivo").mimeType("image/png")
                .storageKey("proj/missing.png").fileSizeBytes(100L).widthPercent(100).build();
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId()))
                .thenReturn(List.of(fig));
        when(figureStorageService.exists(fig.getStorageKey())).thenReturn(false);

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isFalse();
        assertThat(status.pendingItems()).anyMatch(s -> s.contains("Diagrama sem arquivo") && s.contains("arquivo disponível"));
    }

    @Test
    void shouldNotDuplicateStorageAlertForSameFigureReferencedInMultipleChapters() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID figId = UUID.randomUUID();

        mockOwnership(user, project);
        Figure fig = Figure.builder()
                .id(figId).caption("Figura duplicada").mimeType("image/png")
                .storageKey("proj/dup.png").fileSizeBytes(100L).widthPercent(100).build();

        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String marker = "[[@FIG:" + figId + "]]";
        // same figure referenced in two chapters
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", "Intro " + marker));
        chapters.set(1, buildChapter(project, ChapterType.THEORETICAL_FOUNDATION, "Fundamentação", "Fund " + marker));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of(fig));
        when(figureStorageService.exists(fig.getStorageKey())).thenReturn(false);

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        long storageAlerts = status.pendingItems().stream()
                .filter(s -> s.contains("arquivo disponível")).count();
        assertThat(storageAlerts).as("same figure missing from storage should only generate one alert").isEqualTo(1);
    }

    @Test
    void shouldBlockExportWhenChapterHasOrphanTableMarker() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID orphanTableId = UUID.randomUUID();

        mockOwnership(user, project);
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String withOrphanTable = "Texto com tabela inválida [[@TABLE:" + orphanTableId + "]] aqui.";
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", withOrphanTable));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());
        // tableRepository returns empty — orphan marker not resolved (lenient @BeforeEach stub applies)

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isFalse();
        assertThat(status.pendingItems()).anyMatch(s -> s.contains("tabela/quadro inválido"));
    }

    @Test
    void shouldNotBlockWhenAllTableMarkersAreKnown() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID knownTableId = UUID.randomUUID();

        mockOwnership(user, project);
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String withKnownTable = "Texto com tabela válida [[@TABLE:" + knownTableId + "]].";
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", withKnownTable));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        br.com.dwcore.acadflow_api.academictable.domain.AcademicTable knownTable =
                br.com.dwcore.acadflow_api.academictable.domain.AcademicTable.builder()
                        .id(knownTableId)
                        .type(br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType.TABLE)
                        .title("Tabela válida").content("| A |\n|---|\n| 1 |").build();
        when(tableRepository.findByProjectIdOrderByCreatedAtAsc(project.getId()))
                .thenReturn(List.of(knownTable));

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isTrue();
        assertThat(status.pendingItems()).noneMatch(s -> s.contains("tabela/quadro inválido"));
    }

    @Test
    void shouldBlockExportWhenChapterHasOrphanQuadroMarker() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID orphanQuadroId = UUID.randomUUID();

        mockOwnership(user, project);
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String withOrphanQuadro = "Texto com quadro inválido [[@QUADRO:" + orphanQuadroId + "]] aqui.";
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", withOrphanQuadro));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());
        // tableRepository lenient stub returns List.of() — orphan not resolved

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isFalse();
        assertThat(status.pendingItems()).anyMatch(s -> s.contains("tabela/quadro inválido"));
    }

    @Test
    void shouldNotBlockWhenAllQuadroMarkersAreKnown() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID knownQuadroId = UUID.randomUUID();

        mockOwnership(user, project);
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String withKnownQuadro = "Texto com quadro válido [[@QUADRO:" + knownQuadroId + "]].";
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", withKnownQuadro));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        br.com.dwcore.acadflow_api.academictable.domain.AcademicTable knownQuadro =
                br.com.dwcore.acadflow_api.academictable.domain.AcademicTable.builder()
                        .id(knownQuadroId)
                        .type(br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType.QUADRO)
                        .title("Quadro válido").content("| A |\n|---|\n| 1 |").build();
        when(tableRepository.findByProjectIdOrderByCreatedAtAsc(project.getId()))
                .thenReturn(List.of(knownQuadro));

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isTrue();
        assertThat(status.pendingItems()).noneMatch(s -> s.contains("tabela/quadro inválido"));
    }

    @Test
    void shouldBlockExportWhenChapterHasOrphanXrefFigMarker() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID orphanFigId = UUID.randomUUID();

        mockOwnership(user, project);
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String withOrphanXref = "Ver [[@XREF:FIG:" + orphanFigId + "]] para detalhes.";
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", withOrphanXref));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isFalse();
        assertThat(status.pendingItems()).anyMatch(s -> s.contains("referência cruzada inválida"));
    }

    @Test
    void shouldBlockExportWhenChapterHasOrphanXrefTableMarker() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID orphanTableId = UUID.randomUUID();

        mockOwnership(user, project);
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String withOrphanXref = "Conforme a [[@XREF:TABLE:" + orphanTableId + "]] abaixo.";
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", withOrphanXref));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());
        // tableRepository lenient stub returns List.of() — orphan not resolved

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isFalse();
        assertThat(status.pendingItems()).anyMatch(s -> s.contains("referência cruzada inválida"));
    }

    @Test
    void shouldBlockExportWhenChapterHasOrphanXrefQuadroMarker() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID orphanQuadroId = UUID.randomUUID();

        mockOwnership(user, project);
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String withOrphanXref = "Como no [[@XREF:QUADRO:" + orphanQuadroId + "]] anterior.";
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", withOrphanXref));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isFalse();
        assertThat(status.pendingItems()).anyMatch(s -> s.contains("referência cruzada inválida"));
    }

    @Test
    void shouldNotBlockWhenXrefTableMarkerIsKnown() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);
        UUID knownTableId = UUID.randomUUID();

        mockOwnership(user, project);
        List<Chapter> chapters = new ArrayList<>(buildRequiredChapters(project));
        String withKnownXref = "Conforme a [[@XREF:TABLE:" + knownTableId + "]] a seguir.";
        chapters.set(0, buildChapter(project, ChapterType.INTRODUCTION, "Introdução", withKnownXref));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId())).thenReturn(chapters);
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        br.com.dwcore.acadflow_api.academictable.domain.AcademicTable knownTable =
                br.com.dwcore.acadflow_api.academictable.domain.AcademicTable.builder()
                        .id(knownTableId)
                        .type(br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType.TABLE)
                        .title("Tabela válida").content("| A |\n|---|\n| 1 |").build();
        when(tableRepository.findByProjectIdOrderByCreatedAtAsc(project.getId()))
                .thenReturn(List.of(knownTable));

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isTrue();
        assertThat(status.pendingItems()).noneMatch(s -> s.contains("referência cruzada"));
    }

    @Test
    void shouldNotBlockWhenTableExistsButHasNoMarkerInAnyChapter() {
        User user = buildUser("aluno@email.com");
        Project project = buildReadyProject(user);

        mockOwnership(user, project);
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(buildRequiredChapters(project)); // no table markers in content
        when(referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId()))
                .thenReturn(List.of(buildReference(project, true)));
        when(citationRepository.findByProjectId(project.getId())).thenReturn(List.of());
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId())).thenReturn(List.of());

        // A table is registered in the DB but referenced by no chapter
        br.com.dwcore.acadflow_api.academictable.domain.AcademicTable unusedTable =
                br.com.dwcore.acadflow_api.academictable.domain.AcademicTable.builder()
                        .id(UUID.randomUUID())
                        .type(br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType.TABLE)
                        .title("Tabela sem uso").content("| A |\n|---|\n| 1 |").build();
        when(tableRepository.findByProjectIdOrderByCreatedAtAsc(project.getId()))
                .thenReturn(List.of(unusedTable));

        var status = exportService.getExportStatus(project.getId(), "docx", user.getEmail());

        assertThat(status.ready()).isTrue();
        assertThat(status.pendingItems()).noneMatch(s -> s.contains("tabela/quadro"));
    }
}
