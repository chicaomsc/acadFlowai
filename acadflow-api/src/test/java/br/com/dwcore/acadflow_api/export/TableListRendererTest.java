package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTable;
import br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType;
import br.com.dwcore.acadflow_api.export.docx.dto.NumberedTable;
import br.com.dwcore.acadflow_api.export.docx.renderer.TableListRenderer;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class TableListRendererTest {

    private final TableListRenderer renderer = new TableListRenderer();

    private NumberedTable buildNumberedTable(AcademicTableType type, String title, int number) {
        AcademicTable table = AcademicTable.builder()
                .id(UUID.randomUUID()).type(type).title(title)
                .content("| A |\n|---|\n| 1 |").build();
        return new NumberedTable(table, number);
    }

    private String allText(XWPFDocument doc) {
        return doc.getParagraphs().stream()
                .map(XWPFParagraph::getText)
                .collect(Collectors.joining("\n"));
    }

    @Test
    void renderTableListShouldReturnFalseWhenEmpty() {
        XWPFDocument doc = new XWPFDocument();
        boolean rendered = renderer.renderTableList(doc, List.of());
        assertThat(rendered).isFalse();
        assertThat(doc.getParagraphs()).isEmpty();
    }

    @Test
    void renderQuadroListShouldReturnFalseWhenEmpty() {
        XWPFDocument doc = new XWPFDocument();
        boolean rendered = renderer.renderQuadroList(doc, List.of());
        assertThat(rendered).isFalse();
        assertThat(doc.getParagraphs()).isEmpty();
    }

    @Test
    void renderTableListShouldReturnFalseWhenOnlyQuadros() {
        XWPFDocument doc = new XWPFDocument();
        List<NumberedTable> tables = List.of(
                buildNumberedTable(AcademicTableType.QUADRO, "Quadro A", 1));
        boolean rendered = renderer.renderTableList(doc, tables);
        assertThat(rendered).isFalse();
        assertThat(doc.getParagraphs()).isEmpty();
    }

    @Test
    void renderQuadroListShouldReturnFalseWhenOnlyTables() {
        XWPFDocument doc = new XWPFDocument();
        List<NumberedTable> tables = List.of(
                buildNumberedTable(AcademicTableType.TABLE, "Tabela A", 1));
        boolean rendered = renderer.renderQuadroList(doc, tables);
        assertThat(rendered).isFalse();
        assertThat(doc.getParagraphs()).isEmpty();
    }

    @Test
    void renderTableListShouldRenderHeadingAndEntries() {
        XWPFDocument doc = new XWPFDocument();
        List<NumberedTable> tables = List.of(
                buildNumberedTable(AcademicTableType.TABLE, "Distribuição de amostras", 1),
                buildNumberedTable(AcademicTableType.TABLE, "Resultados por grupo", 2));

        boolean rendered = renderer.renderTableList(doc, tables);

        assertThat(rendered).isTrue();
        String text = allText(doc);
        assertThat(text).contains("LISTA DE TABELAS");
        assertThat(text).contains("Tabela 1 – Distribuição de amostras");
        assertThat(text).contains("Tabela 2 – Resultados por grupo");
    }

    @Test
    void renderQuadroListShouldRenderHeadingAndEntries() {
        XWPFDocument doc = new XWPFDocument();
        List<NumberedTable> tables = List.of(
                buildNumberedTable(AcademicTableType.QUADRO, "Comparativo de frameworks", 1));

        boolean rendered = renderer.renderQuadroList(doc, tables);

        assertThat(rendered).isTrue();
        String text = allText(doc);
        assertThat(text).contains("LISTA DE QUADROS");
        assertThat(text).contains("Quadro 1 – Comparativo de frameworks");
    }

    @Test
    void renderTableListShouldOnlyShowTableTypeEntries() {
        XWPFDocument doc = new XWPFDocument();
        List<NumberedTable> mixed = List.of(
                buildNumberedTable(AcademicTableType.TABLE, "Tabela A", 1),
                buildNumberedTable(AcademicTableType.QUADRO, "Quadro B", 1));

        renderer.renderTableList(doc, mixed);

        String text = allText(doc);
        assertThat(text).contains("Tabela 1 – Tabela A");
        assertThat(text).doesNotContain("Quadro");
    }

    @Test
    void renderQuadroListShouldOnlyShowQuadroTypeEntries() {
        XWPFDocument doc = new XWPFDocument();
        List<NumberedTable> mixed = List.of(
                buildNumberedTable(AcademicTableType.TABLE, "Tabela A", 1),
                buildNumberedTable(AcademicTableType.QUADRO, "Quadro B", 1));

        renderer.renderQuadroList(doc, mixed);

        String text = allText(doc);
        assertThat(text).contains("Quadro 1 – Quadro B");
        assertThat(text).doesNotContain("Tabela");
    }
}
