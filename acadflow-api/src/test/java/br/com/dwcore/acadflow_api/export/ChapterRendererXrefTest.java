package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTable;
import br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType;
import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.export.docx.dto.NumberedTable;
import br.com.dwcore.acadflow_api.export.docx.renderer.ChapterRenderer;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateRegistry;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class ChapterRendererXrefTest {

    private final ChapterRenderer renderer = new ChapterRenderer();

    private Chapter chapter(String content) {
        return Chapter.builder()
                .id(UUID.randomUUID())
                .title("Introdução")
                .type(ChapterType.INTRODUCTION)
                .status(ChapterStatus.WRITING)
                .orderIndex(1).wordCount(0).targetWordCount(2000)
                .content(content).build();
    }

    private String allText(XWPFDocument doc) {
        return doc.getParagraphs().stream()
                .map(XWPFParagraph::getText)
                .collect(Collectors.joining(" "));
    }

    @Test
    void shouldRenderXrefFigureAsInlineText() {
        UUID figId = UUID.randomUUID();
        Map<UUID, String> xrefLookup = Map.of(figId, "Figura 2");

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter("Ver [[@XREF:FIG:" + figId + "]] para detalhes.")),
                Map.of(), Map.of(), Map.of(), AcademicTemplateRegistry.ABNT_GENERIC, xrefLookup);

        String text = allText(doc);
        assertThat(text).contains("Figura 2");
        assertThat(text).doesNotContain("[[@XREF:");
    }

    @Test
    void shouldRenderXrefTableAsInlineText() {
        UUID tableId = UUID.randomUUID();
        Map<UUID, String> xrefLookup = Map.of(tableId, "Tabela 3");

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter("Conforme a [[@XREF:TABLE:" + tableId + "]].")),
                Map.of(), Map.of(), Map.of(), AcademicTemplateRegistry.ABNT_GENERIC, xrefLookup);

        String text = allText(doc);
        assertThat(text).contains("Tabela 3");
        assertThat(text).doesNotContain("[[@XREF:");
    }

    @Test
    void shouldRenderXrefQuadroAsInlineText() {
        UUID quadroId = UUID.randomUUID();
        Map<UUID, String> xrefLookup = Map.of(quadroId, "Quadro 1");

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter("Como no [[@XREF:QUADRO:" + quadroId + "]] acima.")),
                Map.of(), Map.of(), Map.of(), AcademicTemplateRegistry.ABNT_GENERIC, xrefLookup);

        String text = allText(doc);
        assertThat(text).contains("Quadro 1");
        assertThat(text).doesNotContain("[[@XREF:");
    }

    @Test
    void shouldRenderFallbackForUnknownXrefUuid() {
        UUID unknownId = UUID.randomUUID();

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter("Ver [[@XREF:FIG:" + unknownId + "]].")),
                Map.of(), Map.of(), Map.of(), AcademicTemplateRegistry.ABNT_GENERIC, Map.of());

        String text = allText(doc);
        assertThat(text).contains("[referência inválida]");
        assertThat(text).doesNotContain("[[@XREF:");
    }

    @Test
    void shouldPreserveSurroundingTextAroundXref() {
        UUID figId = UUID.randomUUID();
        Map<UUID, String> xrefLookup = Map.of(figId, "Figura 1");

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter("Início [[@XREF:FIG:" + figId + "]] fim.")),
                Map.of(), Map.of(), Map.of(), AcademicTemplateRegistry.ABNT_GENERIC, xrefLookup);

        String text = allText(doc);
        assertThat(text).contains("Início");
        assertThat(text).contains("Figura 1");
        assertThat(text).contains("fim.");
    }

    @Test
    void shouldRenderMultipleXrefsInSameParagraph() {
        UUID figId = UUID.randomUUID();
        UUID tableId = UUID.randomUUID();
        Map<UUID, String> xrefLookup = Map.of(
                figId, "Figura 1",
                tableId, "Tabela 2");

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter(
                        "Ver [[@XREF:FIG:" + figId + "]] e [[@XREF:TABLE:" + tableId + "]].")),
                Map.of(), Map.of(), Map.of(), AcademicTemplateRegistry.ABNT_GENERIC, xrefLookup);

        String text = allText(doc);
        assertThat(text).contains("Figura 1");
        assertThat(text).contains("Tabela 2");
        assertThat(text).doesNotContain("[[@XREF:");
    }

    @Test
    void shouldNotBreakRenderingWhenXrefLookupIsEmpty() {
        UUID figId = UUID.randomUUID();

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter("[[@XREF:FIG:" + figId + "]]")),
                Map.of(), Map.of(), Map.of(), AcademicTemplateRegistry.ABNT_GENERIC, Map.of());

        String text = allText(doc);
        assertThat(text).contains("[referência inválida]");
    }

    @Test
    void shouldCoexistWithEmbedTableAndXref() {
        UUID tableId = UUID.randomUUID();
        AcademicTable table = AcademicTable.builder()
                .id(tableId).type(AcademicTableType.TABLE).title("Dados")
                .content("| A |\n|---|\n| 1 |").build();
        NumberedTable nt = new NumberedTable(table, 1);

        Map<UUID, NumberedTable> tableLookup = Map.of(tableId, nt);
        Map<UUID, String> xrefLookup = Map.of(tableId, "Tabela 1");

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(
                        chapter("Ver [[@XREF:TABLE:" + tableId + "]].\n\n[[@TABLE:" + tableId + "]]")),
                Map.of(), Map.of(), tableLookup, AcademicTemplateRegistry.ABNT_GENERIC, xrefLookup);

        String text = allText(doc);
        assertThat(text).contains("Tabela 1");
        assertThat(doc.getTables()).hasSize(1);
        assertThat(text).doesNotContain("[[@XREF:");
        assertThat(text).doesNotContain("[[@TABLE:");
    }

    @Test
    void shouldRenderXrefChapterAsInlineText() {
        UUID chapterId = UUID.randomUUID();
        Map<UUID, String> xrefLookup = Map.of(chapterId, "Capítulo 2");

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter("Ver [[@XREF:CHAPTER:" + chapterId + "]] para mais detalhes.")),
                Map.of(), Map.of(), Map.of(), AcademicTemplateRegistry.ABNT_GENERIC, xrefLookup);

        String text = allText(doc);
        assertThat(text).contains("Capítulo 2");
        assertThat(text).doesNotContain("[[@XREF:");
    }

    @Test
    void shouldRenderFallbackForUnknownChapterXref() {
        UUID unknownChapterId = UUID.randomUUID();

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(chapter("Conforme [[@XREF:CHAPTER:" + unknownChapterId + "]].")),
                Map.of(), Map.of(), Map.of(), AcademicTemplateRegistry.ABNT_GENERIC, Map.of());

        String text = allText(doc);
        assertThat(text).contains("[referência inválida]");
        assertThat(text).doesNotContain("[[@XREF:");
    }
}
