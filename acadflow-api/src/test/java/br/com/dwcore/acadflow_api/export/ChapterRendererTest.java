package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.citation.domain.CitationType;
import br.com.dwcore.acadflow_api.export.docx.renderer.ChapterRenderer;
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
}
