package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.export.docx.DocxBuilder;
import br.com.dwcore.acadflow_api.export.docx.renderer.ChapterRenderer;
import br.com.dwcore.acadflow_api.export.docx.renderer.SummaryRenderer;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateRegistry;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.domain.UserPlan;
import br.com.dwcore.acadflow_api.user.domain.UserRole;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTBookmark;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTHyperlink;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class DocxBookmarkTest {

    private final ChapterRenderer chapterRenderer = new ChapterRenderer();
    private final SummaryRenderer summaryRenderer = new SummaryRenderer();
    private final DocxBuilder docxBuilder = new DocxBuilder();

    private User buildUser() {
        return User.builder().id(UUID.randomUUID()).name("Ana").email("ana@email.com")
                .password("hash").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private Project buildProject(User user) {
        return Project.builder().id(UUID.randomUUID()).user(user)
                .title("TCC").course("CC").institution("UFBA")
                .norm(AcademicNorm.ABNT).status(ProjectStatus.IN_PROGRESS)
                .chapters(new ArrayList<>()).build();
    }

    private Chapter chapter(ChapterType type, String title, int orderIndex) {
        return Chapter.builder().id(UUID.randomUUID())
                .title(title).type(type).status(ChapterStatus.WRITING)
                .orderIndex(orderIndex).level(1).wordCount(50).targetWordCount(2000)
                .content("Texto.").build();
    }

    private Chapter section(Chapter parent, String title, int sectionOrder) {
        return Chapter.builder().id(UUID.randomUUID())
                .parent(parent).title(title).type(parent.getType())
                .status(ChapterStatus.NOT_STARTED).level(2)
                .orderIndex(0).sectionOrder(sectionOrder).wordCount(0).targetWordCount(2000)
                .content("Seção.").build();
    }

    private Set<String> bookmarkNames(XWPFDocument doc) {
        return doc.getParagraphs().stream()
                .flatMap(p -> p.getCTP().getBookmarkStartList().stream())
                .map(CTBookmark::getName)
                .collect(Collectors.toSet());
    }

    private Set<String> hyperlinkAnchors(XWPFDocument doc) {
        return doc.getParagraphs().stream()
                .flatMap(p -> p.getCTP().getHyperlinkList().stream())
                .map(CTHyperlink::getAnchor)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    // ── ChapterRenderer — bookmarks ──────────────────────────────────────────

    @Test
    void shouldAddBookmarkToChapterHeading() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);

        XWPFDocument doc = new XWPFDocument();
        chapterRenderer.render(doc, List.of(intro), Map.of());

        assertThat(bookmarkNames(doc))
                .contains(DocxHelper.bookmarkName(intro.getId()));
    }

    @Test
    void shouldAddBookmarkToSectionHeading() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter s1 = section(intro, "Contextualização", 1);

        XWPFDocument doc = new XWPFDocument();
        chapterRenderer.render(doc, List.of(intro, s1), Map.of());

        assertThat(bookmarkNames(doc))
                .contains(DocxHelper.bookmarkName(intro.getId()))
                .contains(DocxHelper.bookmarkName(s1.getId()));
    }

    @Test
    void shouldAddDistinctBookmarksForMultipleChapters() {
        Chapter c1 = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter c2 = chapter(ChapterType.METHODOLOGY, "Metodologia", 2);

        XWPFDocument doc = new XWPFDocument();
        chapterRenderer.render(doc, List.of(c1, c2), Map.of());

        Set<String> names = bookmarkNames(doc);
        assertThat(names)
                .contains(DocxHelper.bookmarkName(c1.getId()))
                .contains(DocxHelper.bookmarkName(c2.getId()))
                .hasSize(2);
    }

    @Test
    void shouldNotAddBookmarkToReferencesChapter() {
        Chapter refs = Chapter.builder().id(UUID.randomUUID())
                .title("Referências").type(ChapterType.REFERENCES)
                .status(ChapterStatus.NOT_STARTED).orderIndex(2).level(1)
                .wordCount(0).targetWordCount(0).build();

        XWPFDocument doc = new XWPFDocument();
        chapterRenderer.render(doc, List.of(refs), Map.of());

        assertThat(bookmarkNames(doc)).isEmpty();
    }

    // ── SummaryRenderer — hyperlinks ─────────────────────────────────────────

    @Test
    void shouldAddHyperlinkToSummaryChapterEntry() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);

        XWPFDocument doc = new XWPFDocument();
        summaryRenderer.render(doc, List.of(intro), AcademicTemplateRegistry.ABNT_GENERIC);

        assertThat(hyperlinkAnchors(doc))
                .contains(DocxHelper.bookmarkName(intro.getId()));
    }

    @Test
    void shouldAddHyperlinkToSummarySectionEntry() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter s1 = section(intro, "Contextualização", 1);

        XWPFDocument doc = new XWPFDocument();
        summaryRenderer.render(doc, List.of(intro, s1), AcademicTemplateRegistry.ABNT_GENERIC);

        assertThat(hyperlinkAnchors(doc))
                .contains(DocxHelper.bookmarkName(intro.getId()))
                .contains(DocxHelper.bookmarkName(s1.getId()));
    }

    @Test
    void shouldNotAddHyperlinkToReferencesEntry() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter refs = Chapter.builder().id(UUID.randomUUID())
                .title("Referências").type(ChapterType.REFERENCES)
                .status(ChapterStatus.NOT_STARTED).orderIndex(2).level(1)
                .wordCount(0).targetWordCount(0).build();

        XWPFDocument doc = new XWPFDocument();
        summaryRenderer.render(doc, List.of(intro, refs), AcademicTemplateRegistry.ABNT_GENERIC);

        // References must NOT have a hyperlink
        assertThat(hyperlinkAnchors(doc)).doesNotContain(DocxHelper.bookmarkName(refs.getId()));
        // Chapter does have a hyperlink
        assertThat(hyperlinkAnchors(doc)).contains(DocxHelper.bookmarkName(intro.getId()));
    }

    @Test
    void summaryHyperlinkShouldContainChapterTitleText() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);

        XWPFDocument doc = new XWPFDocument();
        summaryRenderer.render(doc, List.of(intro), AcademicTemplateRegistry.ABNT_GENERIC);

        // Text lives inside the hyperlink run — verify via paragraphAllText()
        boolean found = doc.getParagraphs().stream()
                .anyMatch(p -> DocxHelper.paragraphAllText(p).contains("1  INTRODUÇÃO"));
        assertThat(found).isTrue();
    }

    // ── Integration — bookmarks match hyperlink anchors ───────────────────────

    @Test
    void bookmarkAnchorShouldMatchSummaryHyperlink() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter method = chapter(ChapterType.METHODOLOGY, "Metodologia", 2);
        Chapter s1 = section(intro, "Contexto", 1);

        byte[] bytes = docxBuilder.build(project, List.of(intro, method, s1), List.of(),
                Map.of(), Map.of(), Map.of());

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            Set<String> anchors = hyperlinkAnchors(doc);
            Set<String> bookmarks = bookmarkNames(doc);

            // Every hyperlink anchor must have a matching bookmark
            assertThat(anchors).allSatisfy(anchor ->
                    assertThat(bookmarks).contains(anchor));

            // Expect anchors for chapter and section
            assertThat(anchors).contains(DocxHelper.bookmarkName(intro.getId()));
            assertThat(anchors).contains(DocxHelper.bookmarkName(method.getId()));
            assertThat(anchors).contains(DocxHelper.bookmarkName(s1.getId()));
        }
    }

    @Test
    void shouldNotCrashDocumentWithoutSections() {
        Chapter c1 = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter c2 = chapter(ChapterType.METHODOLOGY, "Metodologia", 2);

        assertThatCode(() -> {
            XWPFDocument doc = new XWPFDocument();
            chapterRenderer.render(doc, List.of(c1, c2), Map.of());
            summaryRenderer.render(doc, List.of(c1, c2), AcademicTemplateRegistry.ABNT_GENERIC);
        }).doesNotThrowAnyException();
    }
}
