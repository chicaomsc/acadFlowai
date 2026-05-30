package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.citation.domain.CitationType;
import br.com.dwcore.acadflow_api.export.docx.dto.NumberedFigure;
import br.com.dwcore.acadflow_api.export.docx.renderer.ChapterRenderer;
import br.com.dwcore.acadflow_api.figure.domain.Figure;
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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ChapterRendererTest {

    private final ChapterRenderer renderer = new ChapterRenderer();

    private User buildUser() {
        return User.builder().id(UUID.randomUUID()).name("Aluno").email("a@b.com")
                .password("hash").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private Project buildProject() {
        return Project.builder().id(UUID.randomUUID()).user(buildUser())
                .title("Projeto").course("CC").institution("UFBA")
                .norm(AcademicNorm.ABNT).status(ProjectStatus.IN_PROGRESS)
                .chapters(new ArrayList<>()).build();
    }

    private Reference buildRef(String authors) {
        return Reference.builder().id(UUID.randomUUID())
                .title("Clean Code").authors(authors)
                .type(ReferenceType.BOOK).year(2008)
                .abntFormatted("MARTIN, R. C.. Clean Code. 2008.")
                .hasCitation(true).build();
    }

    private Chapter buildChapter(String content) {
        return Chapter.builder().id(UUID.randomUUID()).project(buildProject())
                .title("Introdução").type(ChapterType.INTRODUCTION)
                .status(ChapterStatus.WRITING).orderIndex(1)
                .wordCount(0).targetWordCount(2000).content(content).build();
    }

    private Citation buildCitation(CitationType type, String authors, String quotedText, String page,
                                   String apudAuthor, String apudYear) {
        Project project = buildProject();
        Chapter chapter = buildChapter(null);
        Reference ref = buildRef(authors);
        return Citation.builder().id(UUID.randomUUID())
                .project(project).chapter(chapter).reference(ref)
                .type(type).quotedText(quotedText).pageNumber(page)
                .apudAuthor(apudAuthor).apudYear(apudYear).build();
    }

    private String extractAllRunText(XWPFDocument doc) {
        StringBuilder sb = new StringBuilder();
        for (XWPFParagraph p : doc.getParagraphs()) {
            sb.append(p.getText()).append("\n");
        }
        return sb.toString();
    }

    @Test
    void shouldSkipReferencesChapter() {
        Chapter refChapter = Chapter.builder().id(UUID.randomUUID()).project(buildProject())
                .title("Referências").type(ChapterType.REFERENCES)
                .status(ChapterStatus.NOT_STARTED).orderIndex(6)
                .wordCount(0).targetWordCount(0).build();

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(refChapter));

        // no content paragraphs (only page break paragraph added for non-skipped chapters)
        String text = extractAllRunText(doc);
        assertThat(text).doesNotContain("REFERÊNCIAS");
    }

    @Test
    void shouldRenderPlainTextWithoutCitations() {
        Chapter chapter = buildChapter("Texto simples sem citações.");
        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter), Map.of());

        String text = extractAllRunText(doc);
        assertThat(text).contains("Texto simples sem citações.");
    }

    @Test
    void shouldSubstituteIndirectCitationMarker() {
        Citation citation = buildCitation(CitationType.INDIRECT, "MARTIN, R. C.", null, null, null, null);
        String content = "Segundo a boa prática [[@CITE:" + citation.getId() + "]] codificar é arte.";
        Chapter chapter = buildChapter(content);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter), Map.of(citation.getId(), citation));

        String text = extractAllRunText(doc);
        assertThat(text).contains("(MARTIN, 2008)");
        assertThat(text).doesNotContain("[[@CITE:");
    }

    @Test
    void shouldSubstituteDirectShortCitationMarker() {
        Citation citation = buildCitation(CitationType.DIRECT_SHORT, "SILVA, J.", "texto", "p. 5", null, null);
        String content = "Conforme afirmado [[@CITE:" + citation.getId() + "]] algo mais.";
        Chapter chapter = buildChapter(content);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter), Map.of(citation.getId(), citation));

        String text = extractAllRunText(doc);
        assertThat(text).contains("(SILVA, 2008, p. 5)");
    }

    @Test
    void shouldRenderDirectLongAsIndentedBlock() {
        Citation citation = buildCitation(CitationType.DIRECT_LONG, "MARTIN, R. C.",
                "Este é um trecho longo citado diretamente.", "p. 100", null, null);
        String content = "[[@CITE:" + citation.getId() + "]]";
        Chapter chapter = buildChapter(content);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter), Map.of(citation.getId(), citation));

        String text = extractAllRunText(doc);
        assertThat(text).contains("Este é um trecho longo citado diretamente.");
        assertThat(text).contains("(MARTIN, 2008, p. 100)");
    }

    @Test
    void shouldSubstituteApudCitationMarker() {
        Citation citation = buildCitation(CitationType.APUD, "SILVA, J.", null, null, "FOWLER", "2003");
        String content = "Citado por [[@CITE:" + citation.getId() + "]].";
        Chapter chapter = buildChapter(content);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter), Map.of(citation.getId(), citation));

        String text = extractAllRunText(doc);
        assertThat(text).contains("apud FOWLER");
    }

    @Test
    void shouldKeepUnknownMarkerAsLiteralText() {
        UUID unknownId = UUID.randomUUID();
        String content = "Texto com marcador inválido [[@CITE:" + unknownId + "]] aqui.";
        Chapter chapter = buildChapter(content);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter), Map.of());

        String text = extractAllRunText(doc);
        assertThat(text).contains("[[@CITE:" + unknownId + "]]");
    }

    @Test
    void shouldRenderMultipleParagraphsSeparately() {
        String content = "Primeiro parágrafo.\n\nSegundo parágrafo.";
        Chapter chapter = buildChapter(content);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter), Map.of());

        long bodyParagraphs = doc.getParagraphs().stream()
                .filter(p -> p.getText().contains("parágrafo"))
                .count();
        assertThat(bodyParagraphs).isEqualTo(2);
    }

    @Test
    void backwardCompatibleRenderWithoutLookup() {
        Chapter chapter = buildChapter("Conteúdo simples.");
        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter)); // 2-arg overload

        String text = extractAllRunText(doc);
        assertThat(text).contains("Conteúdo simples.");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Figure tests
    // ──────────────────────────────────────────────────────────────────────────

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

    private Figure buildFigure(String caption, String sourceText) {
        return Figure.builder()
                .id(UUID.randomUUID())
                .caption(caption)
                .sourceText(sourceText)
                .mimeType("image/png")
                .widthPercent(100)
                .storageKey("test/fig.png")
                .originalFilename("test.png")
                .fileSizeBytes(67L)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void shouldRenderFigureBlock() {
        Figure fig = buildFigure("Diagrama de classes", null);
        NumberedFigure nf = new NumberedFigure(fig, MINIMAL_PNG, 1);
        UUID figId = fig.getId();

        String content = "[[@FIG:" + figId + "]]";
        Chapter chapter = buildChapter(content);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter), Map.of(), Map.of(figId, nf));

        String text = extractAllRunText(doc);
        assertThat(text).contains("Figura 1 – Diagrama de classes");
        assertThat(text).doesNotContain("[[@FIG:");
    }

    @Test
    void shouldNumberFiguresGloballyAcrossChapters() {
        Figure fig1 = buildFigure("Primeira figura", null);
        Figure fig2 = buildFigure("Segunda figura", null);
        NumberedFigure nf1 = new NumberedFigure(fig1, MINIMAL_PNG, 1);
        NumberedFigure nf2 = new NumberedFigure(fig2, MINIMAL_PNG, 2);

        Chapter ch1 = buildChapter("[[@FIG:" + fig1.getId() + "]]");
        Chapter ch2 = Chapter.builder().id(UUID.randomUUID()).project(buildProject())
                .title("Resultados").type(ChapterType.RESULTS)
                .status(ChapterStatus.WRITING).orderIndex(2)
                .wordCount(0).targetWordCount(2000)
                .content("[[@FIG:" + fig2.getId() + "]]").build();

        Map<UUID, NumberedFigure> lookup = Map.of(
                fig1.getId(), nf1,
                fig2.getId(), nf2
        );

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(ch1, ch2), Map.of(), lookup);

        String text = extractAllRunText(doc);
        assertThat(text).contains("Figura 1 – Primeira figura");
        assertThat(text).contains("Figura 2 – Segunda figura");
    }

    @Test
    void shouldKeepUnknownFigureMarkerAsLiteral() {
        UUID unknownId = UUID.randomUUID();
        String content = "Texto com figura inválida [[@FIG:" + unknownId + "]] aqui.";
        Chapter chapter = buildChapter(content);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter), Map.of(), Map.of());

        String text = extractAllRunText(doc);
        assertThat(text).contains("[[@FIG:" + unknownId + "]]");
    }

    @Test
    void shouldKeepCiteMarkersWorkingAlongFigMarkers() {
        Citation citation = buildCitation(CitationType.INDIRECT, "MARTIN, R. C.", null, null, null, null);
        Figure fig = buildFigure("Figura de referência", "Fonte: MARTIN, 2008");
        NumberedFigure nf = new NumberedFigure(fig, MINIMAL_PNG, 1);

        String content = "Segundo o autor [[@CITE:" + citation.getId() + "]] ver também.\n\n"
                + "[[@FIG:" + fig.getId() + "]]";
        Chapter chapter = buildChapter(content);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter),
                Map.of(citation.getId(), citation),
                Map.of(fig.getId(), nf));

        String text = extractAllRunText(doc);
        assertThat(text).contains("(MARTIN, 2008)");
        assertThat(text).contains("Figura 1 – Figura de referência");
        assertThat(text).doesNotContain("[[@CITE:");
        assertThat(text).doesNotContain("[[@FIG:");
    }
}
