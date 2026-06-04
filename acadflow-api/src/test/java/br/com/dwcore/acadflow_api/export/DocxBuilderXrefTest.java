package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTable;
import br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType;
import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.export.docx.DocxBuilder;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.domain.UserPlan;
import br.com.dwcore.acadflow_api.user.domain.UserRole;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class DocxBuilderXrefTest {

    private final DocxBuilder docxBuilder = new DocxBuilder();

    private User buildUser() {
        return User.builder().id(UUID.randomUUID()).name("Ana").email("ana@email.com")
                .password("hash").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private Project buildProject(User user) {
        return Project.builder().id(UUID.randomUUID()).user(user)
                .title("Trabalho com XRef").course("CC").institution("UFBA")
                .norm(AcademicNorm.ABNT).status(ProjectStatus.IN_PROGRESS)
                .chapters(new ArrayList<>()).build();
    }

    private Chapter chapter(Project project, ChapterType type, String title, int order, String content) {
        return Chapter.builder().id(UUID.randomUUID()).project(project)
                .title(title).type(type)
                .status(content != null ? ChapterStatus.WRITING : ChapterStatus.NOT_STARTED)
                .orderIndex(order).wordCount(0).targetWordCount(2000).content(content).build();
    }

    private AcademicTable buildTable(AcademicTableType type, String title, String content) {
        return AcademicTable.builder().id(UUID.randomUUID()).type(type).title(title)
                .content(content).build();
    }

    private String allText(XWPFDocument doc) {
        return doc.getParagraphs().stream()
                .map(XWPFParagraph::getText)
                .collect(Collectors.joining(" "));
    }

    @Test
    void shouldRenderXrefTableAsInlineNumberedText() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        AcademicTable table = buildTable(AcademicTableType.TABLE, "Dados coletados",
                "| A |\n|---|\n| 1 |");

        String content = "[[@TABLE:" + table.getId() + "]]\n\n"
                + "Conforme a [[@XREF:TABLE:" + table.getId() + "]], os dados mostram...";
        Chapter chapter = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1, content);

        byte[] result = docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(), Map.of(), Map.of(table.getId(), table));

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            assertThat(text).contains("Tabela 1");
            assertThat(text).doesNotContain("[[@XREF:");
        }
    }

    @Test
    void shouldRenderXrefQuadroAsInlineNumberedText() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        AcademicTable quadro = buildTable(AcademicTableType.QUADRO, "Comparativo",
                "| A |\n|---|\n| x |");

        String content = "[[@QUADRO:" + quadro.getId() + "]]\n\n"
                + "Como demonstrado no [[@XREF:QUADRO:" + quadro.getId() + "]]...";
        Chapter chapter = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1, content);

        byte[] result = docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(), Map.of(), Map.of(quadro.getId(), quadro));

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            assertThat(text).contains("Quadro 1");
            assertThat(text).doesNotContain("[[@XREF:");
        }
    }

    @Test
    void shouldReferenceSecondTableCorrectlyWhenTwoTablesExist() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        AcademicTable t1 = buildTable(AcademicTableType.TABLE, "Tabela Um",
                "| A |\n|---|\n| 1 |");
        AcademicTable t2 = buildTable(AcademicTableType.TABLE, "Tabela Dois",
                "| A |\n|---|\n| 2 |");

        String content = "[[@TABLE:" + t1.getId() + "]]\n\n"
                + "[[@TABLE:" + t2.getId() + "]]\n\n"
                + "Ver [[@XREF:TABLE:" + t2.getId() + "]] para resultado final.";
        Chapter chapter = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1, content);

        byte[] result = docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(), Map.of(), Map.of(t1.getId(), t1, t2.getId(), t2));

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            assertThat(text).contains("Tabela 1 – Tabela Um");
            assertThat(text).contains("Tabela 2 – Tabela Dois");
            assertThat(text).contains("Tabela 2");
            assertThat(text).doesNotContain("[[@XREF:");
        }
    }

    @Test
    void shouldRenderFallbackForUnknownXrefUuid() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        UUID unknown = UUID.randomUUID();
        Chapter chapter = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1,
                "Ver [[@XREF:TABLE:" + unknown + "]].");

        byte[] result = docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(), Map.of(), Map.of());

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            assertThat(text).contains("[referência inválida]");
            assertThat(text).doesNotContain("[[@XREF:");
        }
    }

    @Test
    void xrefAndEmbedInSameDocumentShouldNotCrash() {
        User user = buildUser();
        Project project = buildProject(user);
        AcademicTable t1 = buildTable(AcademicTableType.TABLE, "T1", "| A |\n|---|\n| 1 |");
        AcademicTable q1 = buildTable(AcademicTableType.QUADRO, "Q1", "| B |\n|---|\n| x |");

        String content = "[[@TABLE:" + t1.getId() + "]]\n\n"
                + "[[@QUADRO:" + q1.getId() + "]]\n\n"
                + "Ref: [[@XREF:TABLE:" + t1.getId() + "]] e [[@XREF:QUADRO:" + q1.getId() + "]].";

        Chapter chapter = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1, content);

        assertThatCode(() -> docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(), Map.of(), Map.of(t1.getId(), t1, q1.getId(), q1)))
                .doesNotThrowAnyException();
    }

    @Test
    void shouldRenderXrefChapterAsInlineNumberedText() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter intro = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1, "Conteúdo da introdução.");
        Chapter methodology = chapter(project, ChapterType.METHODOLOGY, "Metodologia", 2,
                "Conforme [[@XREF:CHAPTER:" + intro.getId() + "]], a metodologia é...");

        byte[] result = docxBuilder.build(project, List.of(intro, methodology), List.of(),
                Map.of(), Map.of(), Map.of());

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            assertThat(text).contains("Capítulo 1");
            assertThat(text).doesNotContain("[[@XREF:");
        }
    }

    @Test
    void shouldAssignChapterNumbersByOrderIndex() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter c1 = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1, "Texto.");
        Chapter c2 = chapter(project, ChapterType.METHODOLOGY, "Metodologia", 2, "Texto.");
        Chapter c3 = chapter(project, ChapterType.RESULTS, "Resultados", 3,
                "Ver [[@XREF:CHAPTER:" + c1.getId() + "]] e [[@XREF:CHAPTER:" + c2.getId() + "]].");

        byte[] result = docxBuilder.build(project, List.of(c1, c2, c3), List.of(),
                Map.of(), Map.of(), Map.of());

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            assertThat(text).contains("Capítulo 1");
            assertThat(text).contains("Capítulo 2");
            assertThat(text).doesNotContain("[[@XREF:");
        }
    }

    @Test
    void shouldNotIncludeReferencesChapterInNumbering() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter intro = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1, "Texto.");
        Chapter refs = chapter(project, ChapterType.REFERENCES, "Referências", 2, null);
        Chapter conclusion = chapter(project, ChapterType.CONCLUSION, "Conclusão", 3,
                "Ver [[@XREF:CHAPTER:" + intro.getId() + "]] e nunca referências.");

        byte[] result = docxBuilder.build(project, List.of(intro, refs, conclusion), List.of(),
                Map.of(), Map.of(), Map.of());

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            // intro = Capítulo 1, refs skipped, conclusion = Capítulo 2
            assertThat(text).contains("Capítulo 1");
            assertThat(text).doesNotContain("Capítulo 3");
            assertThat(text).doesNotContain("[[@XREF:");
        }
    }

    @Test
    void shouldRenderXrefSectionAsInlineNumberedText() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter intro = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1, "Texto.");
        Chapter section = Chapter.builder().id(UUID.randomUUID()).project(project)
                .parent(intro).title("Contextualização").type(ChapterType.INTRODUCTION)
                .status(ChapterStatus.NOT_STARTED).orderIndex(0).sectionOrder(1).level(2)
                .wordCount(0).targetWordCount(2000).build();

        String content = "Conforme [[@XREF:SECTION:" + section.getId() + "]], a análise...";
        Chapter methodology = chapter(project, ChapterType.METHODOLOGY, "Metodologia", 2, content);

        byte[] result = docxBuilder.build(project,
                List.of(intro, methodology, section), List.of(), Map.of(), Map.of(), Map.of());

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            assertThat(text).contains("Seção 1.1");
            assertThat(text).doesNotContain("[[@XREF:");
        }
    }

    @Test
    void shouldRenderXrefSectionFromChapter2AsSeção2Point1() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter intro = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1, "Texto.");
        Chapter methodology = chapter(project, ChapterType.METHODOLOGY, "Metodologia", 2, "Texto.");
        Chapter section = Chapter.builder().id(UUID.randomUUID()).project(project)
                .parent(methodology).title("Instrumentos").type(ChapterType.METHODOLOGY)
                .status(ChapterStatus.NOT_STARTED).orderIndex(0).sectionOrder(1).level(2)
                .wordCount(0).targetWordCount(2000).build();

        String content = "Ver [[@XREF:SECTION:" + section.getId() + "]] para detalhes.";
        Chapter conclusion = chapter(project, ChapterType.CONCLUSION, "Conclusão", 3, content);

        byte[] result = docxBuilder.build(project,
                List.of(intro, methodology, conclusion, section), List.of(),
                Map.of(), Map.of(), Map.of());

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            assertThat(text).contains("Seção 2.1");
            assertThat(text).doesNotContain("[[@XREF:");
        }
    }
}
