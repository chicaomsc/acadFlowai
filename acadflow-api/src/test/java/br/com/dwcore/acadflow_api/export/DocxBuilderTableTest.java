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

class DocxBuilderTableTest {

    private final DocxBuilder docxBuilder = new DocxBuilder();

    private User buildUser() {
        return User.builder().id(UUID.randomUUID()).name("Ana Lima").email("ana@email.com")
                .password("hash").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private Project buildProject(User user) {
        return Project.builder().id(UUID.randomUUID()).user(user)
                .title("Trabalho com Tabelas").course("CC").institution("UFBA")
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

    // ── backward-compat ───────────────────────────────────────────────────────

    @Test
    void threeArgBuildShouldStillWork() {
        assertThatCode(() -> docxBuilder.build(buildProject(buildUser()), List.of(), List.of()))
                .doesNotThrowAnyException();
    }

    @Test
    void fiveArgBuildShouldStillWork() {
        assertThatCode(() -> docxBuilder.build(
                buildProject(buildUser()), List.of(), List.of(), Map.of(), Map.of()))
                .doesNotThrowAnyException();
    }

    // ── LISTA DE TABELAS ──────────────────────────────────────────────────────

    @Test
    void shouldRenderListaDeTabelasWhenTableMarkerPresent() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        AcademicTable table = buildTable(AcademicTableType.TABLE, "Distribuição de amostras",
                "| H1 | H2 |\n|----|----|\n| V1 | V2 |");
        Chapter chapter = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1,
                "Análise.\n\n[[@TABLE:" + table.getId() + "]]");

        byte[] result = docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(), Map.of(), Map.of(table.getId(), table));

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            assertThat(text).contains("LISTA DE TABELAS");
            assertThat(text).contains("Tabela 1 – Distribuição de amostras");
        }
    }

    @Test
    void shouldRenderListaDeQuadrosWhenQuadroMarkerPresent() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        AcademicTable quadro = buildTable(AcademicTableType.QUADRO, "Comparativo de frameworks",
                "| Tech | Stack |\n|------|-------|\n| Spring | Java |");
        Chapter chapter = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1,
                "Veja o quadro.\n\n[[@QUADRO:" + quadro.getId() + "]]");

        byte[] result = docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(), Map.of(), Map.of(quadro.getId(), quadro));

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            assertThat(text).contains("LISTA DE QUADROS");
            assertThat(text).contains("Quadro 1 – Comparativo de frameworks");
        }
    }

    @Test
    void shouldNotRenderListaDeTabelasWhenNoTableMarkers() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1, "Texto simples.");

        byte[] result = docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(), Map.of(), Map.of());

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            assertThat(text).doesNotContain("LISTA DE TABELAS");
            assertThat(text).doesNotContain("LISTA DE QUADROS");
        }
    }

    // ── independent numbering ─────────────────────────────────────────────────

    @Test
    void shouldNumberTablesAndQuadrosIndependently() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);

        AcademicTable t1 = buildTable(AcademicTableType.TABLE, "Tabela Um",
                "| A |\n|---|\n| 1 |");
        AcademicTable t2 = buildTable(AcademicTableType.TABLE, "Tabela Dois",
                "| A |\n|---|\n| 2 |");
        AcademicTable q1 = buildTable(AcademicTableType.QUADRO, "Quadro Um",
                "| B |\n|---|\n| x |");
        AcademicTable q2 = buildTable(AcademicTableType.QUADRO, "Quadro Dois",
                "| B |\n|---|\n| y |");

        String content = "[[@TABLE:" + t1.getId() + "]]\n\n"
                + "[[@QUADRO:" + q1.getId() + "]]\n\n"
                + "[[@TABLE:" + t2.getId() + "]]\n\n"
                + "[[@QUADRO:" + q2.getId() + "]]";

        Chapter chapter = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1, content);
        Map<UUID, AcademicTable> lookup = Map.of(
                t1.getId(), t1, t2.getId(), t2,
                q1.getId(), q1, q2.getId(), q2);

        byte[] result = docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(), Map.of(), lookup);

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            assertThat(text).contains("Tabela 1 – Tabela Um");
            assertThat(text).contains("Tabela 2 – Tabela Dois");
            assertThat(text).contains("Quadro 1 – Quadro Um");
            assertThat(text).contains("Quadro 2 – Quadro Dois");
        }
    }

    @Test
    void shouldRenderTableCaptionInChapterBody() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        AcademicTable table = buildTable(AcademicTableType.TABLE, "Dados coletados",
                "| Grupo | N |\n|-------|---|\n| A | 30 |");
        Chapter chapter = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1,
                "Texto introdutório.\n\n[[@TABLE:" + table.getId() + "]]");

        byte[] result = docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(), Map.of(), Map.of(table.getId(), table));

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(result))) {
            String text = allText(doc);
            assertThat(text).contains("Tabela 1 – Dados coletados");
        }
    }

    @Test
    void unknownTableMarkerShouldNotCrash() {
        User user = buildUser();
        Project project = buildProject(user);
        UUID unknown = UUID.randomUUID();
        Chapter chapter = chapter(project, ChapterType.INTRODUCTION, "Introdução", 1,
                "Texto com marcador desconhecido [[@TABLE:" + unknown + "]].");

        assertThatCode(() -> docxBuilder.build(project, List.of(chapter), List.of(),
                Map.of(), Map.of(), Map.of()))
                .doesNotThrowAnyException();
    }
}
