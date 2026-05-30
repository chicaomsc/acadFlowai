package br.com.dwcore.acadflow_api.export.template;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.citation.domain.CitationDisplayMode;
import br.com.dwcore.acadflow_api.citation.domain.CitationType;
import br.com.dwcore.acadflow_api.export.docx.DocxBuilder;
import br.com.dwcore.acadflow_api.export.docx.dto.LoadedFigure;
import br.com.dwcore.acadflow_api.figure.domain.Figure;
import br.com.dwcore.acadflow_api.project.domain.AcademicDegree;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.reference.domain.Reference;
import br.com.dwcore.acadflow_api.reference.domain.ReferenceType;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.domain.UserPlan;
import br.com.dwcore.acadflow_api.user.domain.UserRole;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Validates the FEMAF institutional template against ABNT_GENERIC and verifies
 * that the DOCX export pipeline (citations, figures) still works end-to-end.
 */
class FemafTemplateTest {

    private final DocxBuilder docxBuilder = new DocxBuilder();

    private static final byte[] MINIMAL_PNG = {
        (byte)0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,
        0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
        0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
        0x08,0x02,0x00,0x00,0x00,(byte)0x90,0x77,0x53,(byte)0xde,
        0x00,0x00,0x00,0x0c,0x49,0x44,0x41,0x54,
        0x08,(byte)0xd7,0x63,(byte)0xf8,(byte)0xcf,(byte)0xc0,0x00,0x00,
        0x00,0x02,0x00,0x01,(byte)0xe2,0x21,(byte)0xbc,0x33,
        0x00,0x00,0x00,0x00,0x49,0x45,0x4e,0x44,
        (byte)0xae,0x42,0x60,(byte)0x82
    };

    // ── Registry / resolver unit tests ───────────────────────────────────────

    @Test
    void femafTypeShouldBeDistinctFromAbntGeneric() {
        assertThat(AcademicTemplateRegistry.FEMAF.type())
                .isEqualTo(AcademicTemplateType.FEMAF)
                .isNotEqualTo(AcademicTemplateType.ABNT_GENERIC);
    }

    @Test
    void femafNatureStatementShouldDifferFromAbntGeneric() {
        assertThat(AcademicTemplateRegistry.FEMAF.natureStatementPattern())
                .isNotEqualTo(AcademicTemplateRegistry.ABNT_GENERIC.natureStatementPattern());
    }

    @Test
    void femafNatureStatementShouldContainMonografia() {
        assertThat(AcademicTemplateRegistry.FEMAF.natureStatementPattern())
                .contains("Monografia");
    }

    @Test
    void abntGenericNatureStatementShouldContainTrabalho() {
        assertThat(AcademicTemplateRegistry.ABNT_GENERIC.natureStatementPattern())
                .contains("Trabalho");
    }

    @Test
    void buildNatureStatementShouldInterpolatePlaceholders() {
        String stmt = AcademicTemplateRegistry.FEMAF
                .buildNatureStatement("Direito", "FEMAF", "Bacharel em Direito");
        assertThat(stmt).contains("Direito");
        assertThat(stmt).contains("FEMAF");
        assertThat(stmt).contains("Bacharel em Direito");
        assertThat(stmt).doesNotContain("{course}");
        assertThat(stmt).doesNotContain("{institution}");
        assertThat(stmt).doesNotContain("{degree}");
    }

    @Test
    void abntGenericShouldHaveAllStandardSectionLabels() {
        AcademicTemplate t = AcademicTemplateRegistry.ABNT_GENERIC;
        assertThat(t.resumoLabel()).isEqualTo("Resumo");
        assertThat(t.abstractLabel()).isEqualTo("Abstract");
        assertThat(t.summaryLabel()).isEqualTo("Sumário");
        assertThat(t.figureListLabel()).isEqualTo("LISTA DE FIGURAS");
        assertThat(t.referencesLabel()).isEqualTo("Referências");
    }

    // ── DOCX integration tests ────────────────────────────────────────────────

    @Test
    void femafDocxShouldContainMonografiaInNatureStatement() throws Exception {
        Project project = femafProject();
        byte[] bytes = docxBuilder.build(project, List.of(), List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            String allText = doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .collect(Collectors.joining(" "));
            assertThat(allText).contains("Monografia");
            assertThat(allText).doesNotContain("Trabalho apresentado");
        }
    }

    @Test
    void abntGenericDocxShouldContainTrabalhoPresentadoInNatureStatement() throws Exception {
        Project project = abntProject();
        byte[] bytes = docxBuilder.build(project, List.of(), List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            String allText = doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .collect(Collectors.joining(" "));
            assertThat(allText).contains("Trabalho apresentado");
        }
    }

    @Test
    void femafDocxShouldPreserveCitations() throws Exception {
        Project project = femafProject();
        Reference ref = buildRef(project);
        Citation citation = Citation.builder().id(UUID.randomUUID())
                .reference(ref).type(CitationType.INDIRECT)
                .displayMode(CitationDisplayMode.PARENTHETICAL)
                .pageNumber(null).build();
        String content = "Texto com citação [[@CITE:" + citation.getId() + "]].";
        Chapter chapter = chapter(project, content);
        byte[] bytes = docxBuilder.build(project, List.of(chapter), List.of(ref),
                Map.of(citation.getId(), citation));
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            String allText = doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .collect(Collectors.joining(" "));
            assertThat(allText).contains("Texto com citação");
        }
    }

    @Test
    void femafDocxShouldPreserveFigures() throws Exception {
        Project project = femafProject();
        Figure fig = Figure.builder().id(UUID.randomUUID()).caption("Diagrama FEMAF")
                .mimeType("image/png").widthPercent(100).storageKey("f.png")
                .originalFilename("f.png").fileSizeBytes(67L).createdAt(LocalDateTime.now()).build();
        Chapter chapter = chapter(project, "[[@FIG:" + fig.getId() + "]]");
        byte[] bytes = docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(), Map.of(fig.getId(), new LoadedFigure(fig, MINIMAL_PNG)));
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            String allText = doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .collect(Collectors.joining(" "));
            assertThat(allText).contains("Diagrama FEMAF");
        }
    }

    @Test
    void femafCoverShouldContainCityAndYear() throws Exception {
        Project project = femafProject();
        byte[] bytes = docxBuilder.build(project, List.of(), List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            String allText = doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .collect(Collectors.joining(" "));
            assertThat(allText).contains("Formosa");
            assertThat(allText).contains("2025");
        }
    }

    // ── Builders ─────────────────────────────────────────────────────────────

    private User buildUser() {
        return User.builder().id(UUID.randomUUID()).name("João Aluno").email("joao@femaf.edu.br")
                .password("hash").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private Project femafProject() {
        return Project.builder()
                .id(UUID.randomUUID()).user(buildUser())
                .title("Direito Tributário na Era Digital")
                .course("Direito").institution("FEMAF")
                .advisorName("Prof. Dr. Ana Lima").norm(AcademicNorm.ABNT)
                .academicDegree(AcademicDegree.GRADUACAO)
                .defenseCity("Formosa").defenseYear(2025)
                .abstractPt("Resumo do trabalho.").abstractEn("Work abstract.")
                .keywords("direito, tributário, digital")
                .templateProfile(AcademicTemplateType.FEMAF)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();
    }

    private Project abntProject() {
        return Project.builder()
                .id(UUID.randomUUID()).user(buildUser())
                .title("Trabalho ABNT Genérico")
                .course("Engenharia").institution("UFBA")
                .advisorName("Prof. Dr. Carlos").norm(AcademicNorm.ABNT)
                .academicDegree(AcademicDegree.GRADUACAO)
                .defenseCity("Salvador").defenseYear(2025)
                .abstractPt("Resumo.").abstractEn("Abstract.")
                .keywords("engenharia")
                .templateProfile(null)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();
    }

    private Reference buildRef(Project project) {
        return Reference.builder().id(UUID.randomUUID()).project(project)
                .title("Código Tributário Nacional").authors("BRASIL")
                .type(ReferenceType.BOOK).year(1966)
                .abntFormatted("BRASIL. Código Tributário Nacional. 1966.")
                .hasCitation(true).build();
    }

    private Chapter chapter(Project project, String content) {
        return Chapter.builder().id(UUID.randomUUID()).project(project)
                .title("Introdução").type(ChapterType.INTRODUCTION)
                .status(ChapterStatus.WRITING).orderIndex(1)
                .wordCount(0).targetWordCount(2000).content(content).build();
    }
}
