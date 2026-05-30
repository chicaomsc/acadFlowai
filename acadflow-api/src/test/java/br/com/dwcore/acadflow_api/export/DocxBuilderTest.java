package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
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
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class DocxBuilderTest {

    private final DocxBuilder docxBuilder = new DocxBuilder();

    private User buildUser() {
        return User.builder().id(UUID.randomUUID()).name("Maria Silva").email("maria@email.com")
                .password("hash").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private Project buildProject(User user) {
        return Project.builder()
                .id(UUID.randomUUID()).user(user)
                .title("Impacto da Inteligência Artificial no Ensino Superior")
                .subtitle("Uma análise exploratória")
                .course("Ciência da Computação").institution("UFBA")
                .advisorName("Prof. Dr. João Santos").norm(AcademicNorm.ABNT)
                .academicDegree(AcademicDegree.GRADUACAO)
                .defenseCity("Salvador").defenseYear(2025)
                .abstractPt("Este trabalho investiga o impacto da IA no ensino superior.")
                .abstractEn("This work investigates the impact of AI in higher education.")
                .keywords("inteligência artificial, ensino superior, tecnologia")
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();
    }

    private List<Chapter> buildChapters(Project project) {
        return List.of(
                chapter(project, ChapterType.INTRODUCTION, "Introdução", 1,
                        "A inteligência artificial tem transformado diversas áreas do conhecimento.\n\nEste trabalho apresenta uma análise exploratória sobre esse fenômeno."),
                chapter(project, ChapterType.THEORETICAL_FOUNDATION, "Fundamentação Teórica", 2,
                        "A fundamentação teórica aborda os principais conceitos relacionados ao tema.\n\nConceitos de machine learning e deep learning são discutidos aqui."),
                chapter(project, ChapterType.METHODOLOGY, "Metodologia", 3,
                        "A pesquisa é de natureza qualitativa e exploratória.\n\nForam realizadas entrevistas com docentes de instituições federais."),
                chapter(project, ChapterType.RESULTS, "Resultados e Discussão", 4,
                        "Os resultados indicam adoção crescente de ferramentas de IA.\n\nAs entrevistas revelaram percepções diversas entre os docentes."),
                chapter(project, ChapterType.CONCLUSION, "Conclusão", 5,
                        "Conclui-se que a IA representa uma oportunidade significativa para o ensino.\n\nRecomenda-se a realização de estudos longitudinais futuros."),
                chapter(project, ChapterType.REFERENCES, "Referências", 6, null)
        );
    }

    private Chapter chapter(Project project, ChapterType type, String title, int order, String content) {
        return Chapter.builder().id(UUID.randomUUID()).project(project)
                .title(title).type(type)
                .status(content != null ? ChapterStatus.WRITING : ChapterStatus.NOT_STARTED)
                .orderIndex(order).wordCount(0).targetWordCount(3000)
                .content(content).build();
    }

    private List<Reference> buildReferences(Project project) {
        return List.of(
                Reference.builder().id(UUID.randomUUID()).project(project)
                        .title("Inteligência Artificial: uma abordagem moderna")
                        .authors("RUSSELL, S.; NORVIG, P.")
                        .type(ReferenceType.BOOK).year(2022)
                        .abntFormatted("RUSSELL, S.; NORVIG, P. Inteligência Artificial: uma abordagem moderna. 4. ed. Rio de Janeiro: Elsevier, 2022.")
                        .hasCitation(true).build(),
                Reference.builder().id(UUID.randomUUID()).project(project)
                        .title("Deep Learning")
                        .authors("GOODFELLOW, I.; BENGIO, Y.; COURVILLE, A.")
                        .type(ReferenceType.BOOK).year(2016)
                        .abntFormatted("GOODFELLOW, I.; BENGIO, Y.; COURVILLE, A. Deep Learning. Cambridge: MIT Press, 2016.")
                        .hasCitation(true).build()
        );
    }

    @Test
    void shouldGenerateNonEmptyDocxFile() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        List<Chapter> chapters = buildChapters(project);
        List<Reference> references = buildReferences(project);

        byte[] result = docxBuilder.build(project, chapters, references);

        assertThat(result).isNotNull();
        assertThat(result.length).isGreaterThan(1000);
    }

    @Test
    void shouldGenerateValidDocxStructure() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        List<Chapter> chapters = buildChapters(project);
        List<Reference> references = buildReferences(project);

        byte[] result = docxBuilder.build(project, chapters, references);

        assertThatCode(() -> {
            try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
                assertThat(doc.getParagraphs()).isNotEmpty();
            }
        }).doesNotThrowAnyException();
    }

    @Test
    void shouldIncludeTitleInDocument() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        List<Chapter> chapters = buildChapters(project);
        List<Reference> references = buildReferences(project);

        byte[] result = docxBuilder.build(project, chapters, references);

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            boolean titleFound = doc.getParagraphs().stream()
                    .anyMatch(p -> p.getText().toUpperCase()
                            .contains("IMPACTO DA INTELIG"));
            assertThat(titleFound).isTrue();
        }
    }

    @Test
    void shouldWorkWithEmptyReferences() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        List<Chapter> chapters = buildChapters(project);

        byte[] result = docxBuilder.build(project, chapters, List.of());

        assertThat(result).isNotNull();
        assertThat(result.length).isGreaterThan(500);
    }

    @Test
    void shouldWorkWithMinimalProject() throws Exception {
        User user = buildUser();
        Project project = Project.builder()
                .id(UUID.randomUUID()).user(user)
                .title("Trabalho Mínimo")
                .course("CC").institution("UFBA").norm(AcademicNorm.ABNT)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();

        byte[] result = docxBuilder.build(project, List.of(), List.of());

        assertThat(result).isNotNull();
        assertThat(result.length).isGreaterThan(500);
    }

    @Test
    void shouldRenderChapterContentAsSeparateParagraphs() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapterWithBlocks = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1,
                "Primeiro parágrafo do capítulo.\n\nSegundo parágrafo do capítulo.");
        List<Reference> references = List.of();

        byte[] result = docxBuilder.build(project, List.of(chapterWithBlocks), references);

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            List<String> texts = doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .filter(t -> t.contains("parágrafo"))
                    .collect(java.util.stream.Collectors.toList());

            assertThat(texts).hasSize(2);
            assertThat(texts.get(0)).contains("Primeiro parágrafo");
            assertThat(texts.get(0)).doesNotContain("Segundo parágrafo");
            assertThat(texts.get(1)).contains("Segundo parágrafo");
            assertThat(texts.get(1)).doesNotContain("Primeiro parágrafo");
        }
    }

    @Test
    void shouldRenderAcademicDegreeLabelInPortuguese() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);

        byte[] result = docxBuilder.build(project, List.of(), List.of());

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String allText = doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .collect(java.util.stream.Collectors.joining(" "));

            assertThat(allText).contains("Gradua");
            assertThat(allText).doesNotContain("GRADUACAO");
        }
    }

    @Test
    void shouldHandleReferenceWithNullAuthors() {
        User user = buildUser();
        Project project = buildProject(user);
        List<Chapter> chapters = List.of();
        List<br.com.dwcore.acadflow_api.reference.domain.Reference> references = List.of(
                br.com.dwcore.acadflow_api.reference.domain.Reference.builder()
                        .id(UUID.randomUUID()).project(project)
                        .title("Título sem autores")
                        .authors(null)
                        .type(ReferenceType.BOOK).year(2023)
                        .abntFormatted(null)
                        .hasCitation(true).build()
        );

        assertThatCode(() -> docxBuilder.build(project, chapters, references))
                .doesNotThrowAnyException();
    }

    // ── page break sequence (BUG-01 / BUG-02) ────────────────────────────────

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

    private Figure buildFigure(String caption) {
        return Figure.builder().id(UUID.randomUUID()).caption(caption)
                .mimeType("image/png").widthPercent(100)
                .storageKey("proj/fig.png").originalFilename("fig.png")
                .fileSizeBytes(67L).createdAt(LocalDateTime.now()).build();
    }

    @Test
    void shouldSeparateListaFigurasFromSumarioWithPageBreak() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        Figure fig = buildFigure("Diagrama de classes");
        UUID figId = fig.getId();

        Chapter chapWithFig = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1,
                "[[@FIG:" + figId + "]]");

        byte[] result = docxBuilder.build(project, List.of(chapWithFig), List.of(),
                Map.of(), Map.of(figId, new LoadedFigure(fig, MINIMAL_PNG)));

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            List<String> texts = doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .collect(Collectors.toList());

            int listaIdx = IntStream.range(0, texts.size())
                    .filter(i -> texts.get(i).contains("LISTA DE FIGURAS"))
                    .findFirst().orElse(-1);
            int sumarioIdx = IntStream.range(0, texts.size())
                    .filter(i -> "SUMÁRIO".equals(texts.get(i)))
                    .findFirst().orElse(-1);

            assertThat(listaIdx).as("LISTA DE FIGURAS deve estar presente").isGreaterThan(-1);
            assertThat(sumarioIdx).as("SUMÁRIO deve estar presente").isGreaterThan(-1);
            assertThat(sumarioIdx).as("SUMÁRIO deve vir após LISTA DE FIGURAS").isGreaterThan(listaIdx);

            // Paragraph immediately before SUMÁRIO must be the empty page-break paragraph
            assertThat(texts.get(sumarioIdx - 1))
                    .as("parágrafo de page break deve separar LISTA DE FIGURAS de SUMÁRIO")
                    .isEmpty();
        }
    }

    @Test
    void shouldNotInsertExtraPageBreakBetweenAbstractAndListaFiguras() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        Figure fig = buildFigure("Arquitetura do sistema");
        UUID figId = fig.getId();

        Chapter chapWithFig = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1,
                "[[@FIG:" + figId + "]]");

        byte[] result = docxBuilder.build(project, List.of(chapWithFig), List.of(),
                Map.of(), Map.of(figId, new LoadedFigure(fig, MINIMAL_PNG)));

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            List<String> texts = doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .collect(Collectors.toList());

            int listaIdx = IntStream.range(0, texts.size())
                    .filter(i -> texts.get(i).contains("LISTA DE FIGURAS"))
                    .findFirst().orElse(-1);

            assertThat(listaIdx).as("LISTA DE FIGURAS deve estar presente").isGreaterThan(1);

            // Exactly ONE empty paragraph immediately before LISTA DE FIGURAS (the single page break)
            assertThat(texts.get(listaIdx - 1))
                    .as("deve haver exatamente um page break antes de LISTA DE FIGURAS")
                    .isEmpty();
            assertThat(texts.get(listaIdx - 2))
                    .as("não deve haver dois page breaks consecutivos antes de LISTA DE FIGURAS")
                    .isNotEmpty();
        }
    }
}
