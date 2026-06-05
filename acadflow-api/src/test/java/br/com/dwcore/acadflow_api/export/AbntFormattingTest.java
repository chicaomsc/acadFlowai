package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTable;
import br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType;
import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.citation.domain.CitationDisplayMode;
import br.com.dwcore.acadflow_api.citation.domain.CitationType;
import br.com.dwcore.acadflow_api.export.docx.DocxBuilder;
import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
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
import org.apache.poi.xwpf.usermodel.*;
import org.junit.jupiter.api.Test;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTSpacing;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STLineSpacingRule;

import java.io.ByteArrayInputStream;
import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that the generated DOCX conforms to ABNT NBR 14724:2011 typography rules.
 */
class AbntFormattingTest {

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

    // ── Builders ──────────────────────────────────────────────────────────────

    private User buildUser() {
        return User.builder().id(UUID.randomUUID()).name("Maria Silva").email("maria@email.com")
                .password("hash").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private Project buildProject() {
        return Project.builder()
                .id(UUID.randomUUID()).user(buildUser())
                .title("Impacto da Inteligência Artificial no Ensino Superior")
                .subtitle("Uma análise exploratória")
                .course("Ciência da Computação").institution("UFBA")
                .advisorName("Prof. Dr. João Santos").norm(AcademicNorm.ABNT)
                .academicDegree(AcademicDegree.GRADUACAO)
                .defenseCity("Salvador").defenseYear(2025)
                .abstractPt("Este trabalho investiga o impacto da IA no ensino superior.")
                .abstractEn("This work investigates the impact of AI in higher education.")
                .keywords("inteligência artificial, ensino superior")
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();
    }

    private Chapter chapter(Project project, ChapterType type, String title, int order, String content) {
        return Chapter.builder().id(UUID.randomUUID()).project(project)
                .title(title).type(type)
                .status(content != null ? ChapterStatus.WRITING : ChapterStatus.NOT_STARTED)
                .orderIndex(order).wordCount(0).targetWordCount(3000)
                .content(content).build();
    }

    private List<Chapter> buildBodyChapters(Project project) {
        return List.of(
                chapter(project, ChapterType.INTRODUCTION,        "Introdução",          1, "A IA transforma o ensino.\n\nSegundo os estudos recentes."),
                chapter(project, ChapterType.THEORETICAL_FOUNDATION, "Fundamentação",   2, "A fundamentação aborda os principais conceitos."),
                chapter(project, ChapterType.METHODOLOGY,         "Metodologia",         3, "Pesquisa qualitativa exploratória."),
                chapter(project, ChapterType.RESULTS,             "Resultados",          4, "Os resultados indicam adoção crescente."),
                chapter(project, ChapterType.CONCLUSION,          "Conclusão",           5, "Conclui-se que a IA é relevante."),
                chapter(project, ChapterType.REFERENCES,          "Referências",         6, null)
        );
    }

    private Reference buildRef(Project project) {
        return Reference.builder().id(UUID.randomUUID()).project(project)
                .title("Clean Code").authors("MARTIN, R. C.")
                .type(ReferenceType.BOOK).year(2008)
                .abntFormatted("MARTIN, R. C.. Clean Code. 2008.")
                .hasCitation(true).build();
    }

    private List<XWPFRun> allRuns(XWPFDocument doc) {
        return doc.getParagraphs().stream()
                .flatMap(p -> p.getRuns().stream())
                .collect(Collectors.toList());
    }

    private List<XWPFRun> runsWithFontSet(XWPFDocument doc) {
        return allRuns(doc).stream()
                .filter(r -> r.getFontSizeAsDouble() != null)
                .collect(Collectors.toList());
    }

    private XWPFDocument buildDoc(Project project, List<Chapter> chapters, List<Reference> refs) throws Exception {
        byte[] bytes = docxBuilder.build(project, chapters, refs);
        return new XWPFDocument(new ByteArrayInputStream(bytes));
    }

    // ── Typography constants ──────────────────────────────────────────────────

    @Test
    void docxHelperConstantsShouldMatchAbnt() {
        assertThat(DocxHelper.FONT).isEqualTo("Times New Roman");
        assertThat(DocxHelper.FONT_BODY).isEqualTo(12);
        assertThat(DocxHelper.FONT_SMALL).isEqualTo(10);
        assertThat(DocxHelper.SPACING_BODY).isEqualTo(1.5);
        assertThat(DocxHelper.SPACING_SINGLE).isEqualTo(1.0);
        assertThat(DocxHelper.INDENT_PARAGRAPH).isEqualTo(709);
        assertThat(DocxHelper.INDENT_LONG_CITE).isEqualTo(2268);
        assertThat(DocxHelper.INDENT_NATURE_STMT).isEqualTo(4252);
    }

    // ── Font sizes ───────────────────────────────────────────────────────────

    @Test
    void noRunShouldExceed14pt() throws Exception {
        Project project = buildProject();
        byte[] bytes = docxBuilder.build(project, buildBodyChapters(project), List.of(buildRef(project)));
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            List<XWPFRun> offenders = runsWithFontSet(doc).stream()
                    .filter(r -> r.getFontSizeAsDouble() > 14.0)
                    .collect(Collectors.toList());
            assertThat(offenders)
                    .as("no run should have font > 14pt")
                    .isEmpty();
        }
    }

    @Test
    void bodyTextRunsShouldBe12pt() throws Exception {
        Project project = buildProject();
        List<Chapter> chapters = List.of(chapter(project, ChapterType.INTRODUCTION,
                "Introdução", 1, "Parágrafo de teste do corpo textual."));
        byte[] bytes = docxBuilder.build(project, chapters, List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            // Find the chapter body paragraph
            Optional<XWPFParagraph> bodyPara = doc.getParagraphs().stream()
                    .filter(p -> p.getText().contains("Parágrafo de teste"))
                    .findFirst();
            assertThat(bodyPara).isPresent();
            bodyPara.get().getRuns().forEach(r ->
                    assertThat(r.getFontSizeAsDouble())
                            .as("body text run font size should be 12pt")
                            .isEqualTo(12.0)
            );
        }
    }

    @Test
    void figureCaptionShouldBe10pt() throws Exception {
        Project project = buildProject();
        Figure fig = Figure.builder().id(UUID.randomUUID()).caption("Diagrama de classes")
                .mimeType("image/png").widthPercent(100)
                .storageKey("proj/fig.png").originalFilename("fig.png")
                .fileSizeBytes(67L).createdAt(LocalDateTime.now()).build();
        UUID figId = fig.getId();
        Chapter chapWithFig = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1,
                "[[@FIG:" + figId + "]]");
        byte[] bytes = docxBuilder.build(project, List.of(chapWithFig), List.of(),
                Map.of(), Map.of(figId, new LoadedFigure(fig, MINIMAL_PNG)));

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            // LISTA DE FIGURAS entry (12pt) appears before the in-chapter caption (10pt) —
            // reduce to last occurrence to get the actual caption below the image.
            Optional<XWPFParagraph> captionPara = doc.getParagraphs().stream()
                    .filter(p -> p.getText().contains("Figura 1 – Diagrama de classes"))
                    .reduce((a, b) -> b);
            assertThat(captionPara).isPresent();
            captionPara.get().getRuns().forEach(r ->
                    assertThat(r.getFontSizeAsDouble())
                            .as("caption run font should be 10pt (FONT_SMALL)")
                            .isEqualTo(10.0)
            );
        }
    }

    @Test
    void longCitationShouldBe10pt() throws Exception {
        Project project = buildProject();
        Reference ref = buildRef(project);
        Citation longCite = Citation.builder().id(UUID.randomUUID())
                .reference(ref).type(CitationType.DIRECT_LONG)
                .displayMode(CitationDisplayMode.PARENTHETICAL)
                .quotedText("Trecho longo citado diretamente do autor.")
                .pageNumber("p. 42").build();
        String content = "[[@CITE:" + longCite.getId() + "]]";
        Chapter chapter = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1, content);

        byte[] bytes = docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(longCite.getId(), longCite));
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            Optional<XWPFParagraph> longCitePara = doc.getParagraphs().stream()
                    .filter(p -> p.getText().contains("Trecho longo citado"))
                    .findFirst();
            assertThat(longCitePara).isPresent();
            longCitePara.get().getRuns().forEach(r ->
                    assertThat(r.getFontSizeAsDouble())
                            .as("long citation run font should be 10pt")
                            .isEqualTo(10.0)
            );
        }
    }

    // ── Indentation ──────────────────────────────────────────────────────────

    @Test
    void bodyParagraphShouldHaveFirstLineIndent() throws Exception {
        Project project = buildProject();
        List<Chapter> chapters = List.of(chapter(project, ChapterType.INTRODUCTION,
                "Introdução", 1, "Parágrafo com recuo de primeira linha."));
        byte[] bytes = docxBuilder.build(project, chapters, List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            Optional<XWPFParagraph> bodyPara = doc.getParagraphs().stream()
                    .filter(p -> p.getText().contains("recuo de primeira linha"))
                    .findFirst();
            assertThat(bodyPara).isPresent();
            assertThat(bodyPara.get().getIndentationFirstLine())
                    .as("body paragraph first-line indent should be 709 twips (1.25 cm)")
                    .isEqualTo(DocxHelper.INDENT_PARAGRAPH);
        }
    }

    @Test
    void longCitationShouldHave4cmLeftIndent() throws Exception {
        Project project = buildProject();
        Reference ref = buildRef(project);
        Citation longCite = Citation.builder().id(UUID.randomUUID())
                .reference(ref).type(CitationType.DIRECT_LONG)
                .displayMode(CitationDisplayMode.PARENTHETICAL)
                .quotedText("Trecho longo para teste de recuo.")
                .pageNumber("p. 10").build();
        Chapter chapter = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1,
                "[[@CITE:" + longCite.getId() + "]]");

        byte[] bytes = docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(longCite.getId(), longCite));
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            Optional<XWPFParagraph> longCitePara = doc.getParagraphs().stream()
                    .filter(p -> p.getText().contains("Trecho longo para teste"))
                    .findFirst();
            assertThat(longCitePara).isPresent();
            assertThat(longCitePara.get().getIndentationLeft())
                    .as("long citation left indent should be 2268 twips (4 cm)")
                    .isEqualTo(DocxHelper.INDENT_LONG_CITE);
        }
    }

    // ── Alignment ────────────────────────────────────────────────────────────

    @Test
    void bodyParagraphShouldBeJustified() throws Exception {
        Project project = buildProject();
        List<Chapter> chapters = List.of(chapter(project, ChapterType.INTRODUCTION,
                "Introdução", 1, "Parágrafo justificado para teste de alinhamento."));
        byte[] bytes = docxBuilder.build(project, chapters, List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            Optional<XWPFParagraph> bodyPara = doc.getParagraphs().stream()
                    .filter(p -> p.getText().contains("justificado para teste"))
                    .findFirst();
            assertThat(bodyPara).isPresent();
            assertThat(bodyPara.get().getAlignment())
                    .as("body paragraph must be justified (BOTH)")
                    .isEqualTo(ParagraphAlignment.BOTH);
        }
    }

    // ── Cover — no artificial empty-line sequences ────────────────────────────

    @Test
    void coverShouldNotHaveMoreThanOneConsecutiveEmptyParagraph() throws Exception {
        Project project = buildProject();
        byte[] bytes = docxBuilder.build(project, List.of(), List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            List<XWPFParagraph> paras = doc.getParagraphs();
            // Only check the cover page (before the first page-break paragraph)
            List<String> coverTexts = new ArrayList<>();
            for (XWPFParagraph p : paras) {
                if (p.isPageBreak()) break;
                coverTexts.add(p.getText());
            }
            int maxConsecutiveEmpty = 0, consecutive = 0;
            for (String t : coverTexts) {
                if (t.isBlank()) {
                    consecutive++;
                    maxConsecutiveEmpty = Math.max(maxConsecutiveEmpty, consecutive);
                } else {
                    consecutive = 0;
                }
            }
            assertThat(maxConsecutiveEmpty)
                    .as("cover page should not have more than 1 consecutive empty paragraph")
                    .isLessThanOrEqualTo(1);
        }
    }

    // ── Page-break sequence ───────────────────────────────────────────────────

    @Test
    void listaFigurasAndSumarioShouldBeOnSeparatePages() throws Exception {
        Project project = buildProject();
        Figure fig = Figure.builder().id(UUID.randomUUID()).caption("Diagrama teste")
                .mimeType("image/png").widthPercent(100)
                .storageKey("p/f.png").originalFilename("f.png")
                .fileSizeBytes(67L).createdAt(LocalDateTime.now()).build();
        UUID figId = fig.getId();
        Chapter chapWithFig = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1,
                "[[@FIG:" + figId + "]]");

        byte[] bytes = docxBuilder.build(project, List.of(chapWithFig), List.of(),
                Map.of(), Map.of(figId, new LoadedFigure(fig, MINIMAL_PNG)));
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            List<String> texts = doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .collect(Collectors.toList());
            int listaIdx = texts.indexOf("LISTA DE FIGURAS");
            int sumarioIdx = texts.indexOf("SUMÁRIO");
            assertThat(listaIdx).isGreaterThan(-1);
            assertThat(sumarioIdx).isGreaterThan(listaIdx);
            // Page-break paragraph must be immediately before SUMÁRIO
            assertThat(texts.get(sumarioIdx - 1))
                    .as("page-break paragraph between LISTA DE FIGURAS and SUMÁRIO must be empty")
                    .isEmpty();
        }
    }

    @Test
    void withoutFiguresSumarioShouldFollowAbstractDirectly() throws Exception {
        Project project = buildProject();
        // No figures — no LISTA DE FIGURAS section
        byte[] bytes = docxBuilder.build(project, buildBodyChapters(project), List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            List<String> texts = doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .collect(Collectors.toList());
            assertThat(texts).as("no LISTA DE FIGURAS when there are no figures")
                    .doesNotContain("LISTA DE FIGURAS");
            assertThat(texts).contains("SUMÁRIO");
        }
    }

    // ── Reference alignment ──────────────────────────────────────────────────

    @Test
    void referencesShouldBeLeftAligned() throws Exception {
        Project project = buildProject();
        Reference ref = buildRef(project);
        byte[] bytes = docxBuilder.build(project, List.of(), List.of(ref));
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            Optional<XWPFParagraph> refPara = doc.getParagraphs().stream()
                    .filter(p -> p.getText().contains("MARTIN"))
                    .findFirst();
            assertThat(refPara).isPresent();
            assertThat(refPara.get().getAlignment())
                    .as("reference paragraph must be left-aligned (ABNT)")
                    .isEqualTo(ParagraphAlignment.LEFT);
        }
    }

    @Test
    void bodyParagraphShouldHaveZeroSpacingBeforeAndAfter() throws Exception {
        Project project = buildProject();
        List<Chapter> chapters = List.of(chapter(project, ChapterType.INTRODUCTION,
                "Introdução", 1, "Parágrafo zero spacing."));
        byte[] bytes = docxBuilder.build(project, chapters, List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            Optional<XWPFParagraph> bodyPara = doc.getParagraphs().stream()
                    .filter(p -> p.getText().contains("Parágrafo zero spacing"))
                    .findFirst();
            assertThat(bodyPara).isPresent();
            assertThat(bodyPara.get().getSpacingBefore())
                    .as("body paragraph spacingBefore must be explicitly 0")
                    .isEqualTo(0);
            assertThat(bodyPara.get().getSpacingAfter())
                    .as("body paragraph spacingAfter must be explicitly 0")
                    .isEqualTo(0);
        }
    }

    @Test
    void docxShouldContainAbntBodyStyle() throws Exception {
        Project project = buildProject();
        byte[] bytes = docxBuilder.build(project, List.of(), List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            assertThat(doc.getStyles())
                    .as("document must have a styles part")
                    .isNotNull();
            assertThat(doc.getStyles().getStyle(DocxHelper.STYLE_BODY))
                    .as("document must contain named style " + DocxHelper.STYLE_BODY)
                    .isNotNull();
        }
    }

    // ── Line spacing ─────────────────────────────────────────────────────────

    @Test
    void bodyParagraphShouldHave15LineSpacingInXml() throws Exception {
        Project project = buildProject();
        List<Chapter> chapters = List.of(chapter(project, ChapterType.INTRODUCTION,
                "Introdução", 1, "Parágrafo para teste de espaçamento 1.5."));
        byte[] bytes = docxBuilder.build(project, chapters, List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            Optional<XWPFParagraph> bodyPara = doc.getParagraphs().stream()
                    .filter(p -> p.getText().contains("espaçamento 1.5"))
                    .findFirst();
            assertThat(bodyPara).isPresent();
            CTSpacing spacing = bodyPara.get().getCTP().getPPr().getSpacing();
            assertThat(spacing).isNotNull();
            assertThat(spacing.getLine())
                    .as("body paragraph must have w:line=360 (1.5x with AUTO rule)")
                    .isEqualTo(BigInteger.valueOf(360));
            assertThat(spacing.getLineRule())
                    .as("body paragraph line rule must be AUTO")
                    .isEqualTo(STLineSpacingRule.AUTO);
        }
    }

    @Test
    void referencesShouldBeSingleSpaced() throws Exception {
        Project project = buildProject();
        Reference ref = buildRef(project);
        byte[] bytes = docxBuilder.build(project, List.of(), List.of(ref));
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            Optional<XWPFParagraph> refPara = doc.getParagraphs().stream()
                    .filter(p -> p.getText().contains("MARTIN"))
                    .findFirst();
            assertThat(refPara).isPresent();
            CTSpacing spacing = refPara.get().getCTP().getPPr().getSpacing();
            assertThat(spacing).isNotNull();
            assertThat(spacing.getLine())
                    .as("reference paragraph must be single-spaced (w:line=240)")
                    .isEqualTo(BigInteger.valueOf(240));
        }
    }

    // ── Heading spacing ──────────────────────────────────────────────────────

    @Test
    void chapterHeadingShouldHaveSpacingBeforeAndAfter() throws Exception {
        Project project = buildProject();
        List<Chapter> chapters = List.of(chapter(project, ChapterType.INTRODUCTION,
                "Introdução", 1, "Conteúdo do capítulo."));
        byte[] bytes = docxBuilder.build(project, chapters, List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            // Filter by style to avoid matching the TOC hyperlink entry with the same text
            Optional<XWPFParagraph> heading = doc.getParagraphs().stream()
                    .filter(p -> DocxHelper.STYLE_HEADING.equals(p.getStyle())
                            && p.getText().contains("INTRODUÇÃO"))
                    .findFirst();
            assertThat(heading).isPresent();
            assertThat(heading.get().getSpacingBefore())
                    .as("chapter heading must have 480 twips (24 pt) before")
                    .isEqualTo(DocxHelper.SPC_BEFORE_HEADING);
            assertThat(heading.get().getSpacingAfter())
                    .as("chapter heading must have 240 twips (12 pt) after")
                    .isEqualTo(DocxHelper.SPC_AFTER_HEADING);
        }
    }

    @Test
    void sectionHeadingShouldHaveSpacingBeforeAndAfter() throws Exception {
        Project project = buildProject();
        Chapter intro = Chapter.builder().id(UUID.randomUUID())
                .title("Introdução").type(ChapterType.INTRODUCTION)
                .status(ChapterStatus.WRITING).orderIndex(1).level(1)
                .wordCount(0).targetWordCount(2000).content("Texto.").build();
        Chapter s1 = Chapter.builder().id(UUID.randomUUID())
                .parent(intro).title("Contextualização").type(ChapterType.INTRODUCTION)
                .status(ChapterStatus.WRITING).level(2).orderIndex(0).sectionOrder(1)
                .wordCount(0).targetWordCount(2000).content("Seção.").build();
        byte[] bytes = docxBuilder.build(project, List.of(intro, s1), List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            // Filter by style to avoid matching the TOC entry (STYLE_BODY) with the same text
            Optional<XWPFParagraph> sectionHeading = doc.getParagraphs().stream()
                    .filter(p -> DocxHelper.STYLE_HEADING.equals(p.getStyle())
                            && p.getText().contains("Contextualização"))
                    .findFirst();
            assertThat(sectionHeading).isPresent();
            assertThat(sectionHeading.get().getSpacingBefore())
                    .as("section heading must have 240 twips (12 pt) before")
                    .isEqualTo(DocxHelper.SPC_AFTER_HEADING);
            assertThat(sectionHeading.get().getSpacingAfter())
                    .as("section heading must have 240 twips (12 pt) after")
                    .isEqualTo(DocxHelper.SPC_AFTER_HEADING);
        }
    }

    // ── Cover / title page spacing — BUG-01 / BUG-02 fixes ──────────────────

    @Test
    void coverParagraphsShouldHaveExplicitZeroSpacingAfter() throws Exception {
        Project project = buildProject();
        byte[] bytes = docxBuilder.build(project, List.of(), List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            List<XWPFParagraph> coverParas = new ArrayList<>();
            for (XWPFParagraph p : doc.getParagraphs()) {
                if (p.isPageBreak()) break;
                if (!p.getText().isBlank()) coverParas.add(p);
            }
            assertThat(coverParas).isNotEmpty();
            coverParas.forEach(p ->
                    assertThat(p.getSpacingAfter())
                            .as("cover paragraph [" + p.getText() + "] must have explicit spacingAfter=0")
                            .isEqualTo(0)
            );
        }
    }

    @Test
    void titlePageParagraphsShouldHaveExplicitZeroSpacingAfter() throws Exception {
        Project project = buildProject();
        byte[] bytes = docxBuilder.build(project, List.of(), List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            List<XWPFParagraph> titlePageParas = new ArrayList<>();
            int pageBreaks = 0;
            for (XWPFParagraph p : doc.getParagraphs()) {
                if (p.isPageBreak()) {
                    pageBreaks++;
                    if (pageBreaks == 2) break;
                    continue;
                }
                if (pageBreaks == 1 && !p.getText().isBlank()) titlePageParas.add(p);
            }
            assertThat(titlePageParas).isNotEmpty();
            titlePageParas.forEach(p ->
                    assertThat(p.getSpacingAfter())
                            .as("title page paragraph [" + p.getText() + "] must have explicit spacingAfter=0")
                            .isEqualTo(0)
            );
        }
    }

    // ── Reference hanging indent ─────────────────────────────────────────────

    @Test
    void referencesShouldHaveHangingIndent() throws Exception {
        Project project = buildProject();
        Reference ref = buildRef(project);
        byte[] bytes = docxBuilder.build(project, List.of(), List.of(ref));
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            Optional<XWPFParagraph> refPara = doc.getParagraphs().stream()
                    .filter(p -> p.getText().contains("MARTIN"))
                    .findFirst();
            assertThat(refPara).isPresent();
            assertThat(refPara.get().getIndentationLeft())
                    .as("reference must have 720 twips left indent (ABNT hanging format)")
                    .isEqualTo(DocxHelper.INDENT_REF_HANGING);
            assertThat(refPara.get().getIndentationHanging())
                    .as("reference must have 720 twips hanging indent (first line at margin)")
                    .isEqualTo(DocxHelper.INDENT_REF_HANGING);
        }
    }

    // ── All ABNT named styles ────────────────────────────────────────────────

    @Test
    void allAbntStylesShouldBeRegistered() throws Exception {
        Project project = buildProject();
        byte[] bytes = docxBuilder.build(project, List.of(), List.of());
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            XWPFStyles styles = doc.getStyles();
            assertThat(styles).isNotNull();
            List.of(DocxHelper.STYLE_BODY, DocxHelper.STYLE_HEADING,
                    DocxHelper.STYLE_COVER_TOP, DocxHelper.STYLE_COVER_CENTER,
                    DocxHelper.STYLE_COVER_BOTTOM, DocxHelper.STYLE_CAPTION,
                    DocxHelper.STYLE_QUOTE, DocxHelper.STYLE_REF, DocxHelper.STYLE_TABLE)
                    .forEach(id -> assertThat(styles.getStyle(id))
                            .as("style '" + id + "' must be registered in the document")
                            .isNotNull());
        }
    }

    // ── Complete document integration ────────────────────────────────────────

    @Test
    void completeDocumentWithAllElementsShouldBuildSuccessfully() throws Exception {
        Project project = buildProject();

        Figure fig = Figure.builder().id(UUID.randomUUID()).caption("Figura de teste")
                .mimeType("image/png").widthPercent(100)
                .storageKey("p/f.png").originalFilename("f.png")
                .fileSizeBytes(67L).createdAt(LocalDateTime.now()).build();
        UUID figId = fig.getId();

        AcademicTable table = AcademicTable.builder().id(UUID.randomUUID())
                .type(AcademicTableType.TABLE).title("Dados coletados")
                .content("| A | B |\n|---|---|\n| 1 | 2 |").build();
        AcademicTable quadro = AcademicTable.builder().id(UUID.randomUUID())
                .type(AcademicTableType.QUADRO).title("Categorias analíticas")
                .content("| Cat | Def |\n|-----|-----|\n| A   | B   |").build();

        Reference ref = buildRef(project);
        Citation cite = Citation.builder().id(UUID.randomUUID())
                .reference(ref).type(CitationType.INDIRECT)
                .displayMode(CitationDisplayMode.PARENTHETICAL).build();

        Chapter intro = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1,
                "A IA transforma o ensino [[@CITE:" + cite.getId() + "]].\n\n" +
                "Ver [[@XREF:FIG:" + figId + "]].\n\n[[@FIG:" + figId + "]]");
        Chapter introS1 = Chapter.builder().id(UUID.randomUUID())
                .parent(intro).title("Contextualização").type(ChapterType.INTRODUCTION)
                .status(ChapterStatus.WRITING).level(2).orderIndex(0).sectionOrder(1)
                .wordCount(50).targetWordCount(2000).content("Texto da seção.").build();
        Chapter method = chapter(project, ChapterType.METHODOLOGY, "Metodologia", 2,
                "[[@TABLE:" + table.getId() + "]]\n\n[[@QUADRO:" + quadro.getId() + "]]");
        Chapter refs = chapter(project, ChapterType.REFERENCES, "Referências", 3, null);

        byte[] bytes = docxBuilder.build(project,
                List.of(intro, introS1, method, refs), List.of(ref),
                Map.of(cite.getId(), cite),
                Map.of(figId, new LoadedFigure(fig, MINIMAL_PNG)),
                Map.of(table.getId(), table, quadro.getId(), quadro));

        assertThat(bytes).isNotNull().hasSizeGreaterThan(5000);

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            List<String> texts = doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText).collect(Collectors.toList());
            assertThat(texts).anyMatch(t -> t.contains("RESUMO"));
            assertThat(texts).anyMatch(t -> t.contains("SUMÁRIO"));
            assertThat(texts).anyMatch(t -> t.contains("LISTA DE FIGURAS"));
            assertThat(texts).anyMatch(t -> t.contains("LISTA DE TABELAS"));
            assertThat(texts).anyMatch(t -> t.contains("LISTA DE QUADROS"));
            assertThat(texts).anyMatch(t -> t.contains("INTRODUÇÃO"));
            assertThat(texts).anyMatch(t -> t.contains("METODOLOGIA"));
            assertThat(texts).anyMatch(t -> t.contains("REFERÊNCIAS"));
            assertThat(doc.getTables()).hasSizeGreaterThanOrEqualTo(1);
        }
    }
}
