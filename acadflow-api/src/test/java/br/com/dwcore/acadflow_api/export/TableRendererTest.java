package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTable;
import br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType;
import br.com.dwcore.acadflow_api.export.docx.renderer.TableRenderer;
import br.com.dwcore.acadflow_api.export.docx.dto.NumberedTable;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.junit.jupiter.api.Test;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblBorders;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STBorder;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class TableRendererTest {

    private final TableRenderer renderer = new TableRenderer();

    private AcademicTable buildTable(AcademicTableType type, String title, String content, String source) {
        return AcademicTable.builder()
                .id(UUID.randomUUID()).type(type).title(title)
                .content(content).sourceText(source).build();
    }

    private String allParagraphText(XWPFDocument doc) {
        return doc.getParagraphs().stream()
                .map(XWPFParagraph::getText)
                .collect(Collectors.joining("\n"));
    }

    @Test
    void shouldRenderTitleAboveTable() {
        AcademicTable table = buildTable(AcademicTableType.TABLE, "Distribuição de amostras",
                "| A | B |\n|---|---|\n| 1 | 2 |", null);
        XWPFDocument doc = new XWPFDocument();

        renderer.render(doc, new NumberedTable(table, 1));

        String text = allParagraphText(doc);
        assertThat(text).contains("Tabela 1 – Distribuição de amostras");
    }

    @Test
    void shouldRenderQuadroTitleWithQuadroLabel() {
        AcademicTable table = buildTable(AcademicTableType.QUADRO, "Comparativo de tecnologias",
                "| Tech | Uso |\n|-----|-----|\n| Java | Backend |", null);
        XWPFDocument doc = new XWPFDocument();

        renderer.render(doc, new NumberedTable(table, 2));

        String text = allParagraphText(doc);
        assertThat(text).contains("Quadro 2 – Comparativo de tecnologias");
    }

    @Test
    void shouldRenderSourceTextBelowTable() {
        AcademicTable table = buildTable(AcademicTableType.TABLE, "Dados coletados",
                "| X |\n|---|\n| 1 |", "Elaborado pelo autor (2025)");
        XWPFDocument doc = new XWPFDocument();

        renderer.render(doc, new NumberedTable(table, 1));

        String text = allParagraphText(doc);
        assertThat(text).contains("Fonte: Elaborado pelo autor (2025)");
    }

    @Test
    void shouldNotRenderSourceWhenNull() {
        AcademicTable table = buildTable(AcademicTableType.TABLE, "Sem fonte",
                "| A |\n|---|\n| 1 |", null);
        XWPFDocument doc = new XWPFDocument();

        renderer.render(doc, new NumberedTable(table, 1));

        String text = allParagraphText(doc);
        assertThat(text).doesNotContain("Fonte:");
    }

    @Test
    void shouldCreateXwpfTableWithCorrectRowCount() {
        String markdown = "| H1 | H2 |\n|----|----|\n| R1C1 | R1C2 |\n| R2C1 | R2C2 |";
        AcademicTable table = buildTable(AcademicTableType.TABLE, "Tabela teste", markdown, null);
        XWPFDocument doc = new XWPFDocument();

        renderer.render(doc, new NumberedTable(table, 1));

        List<XWPFTable> tables = doc.getTables();
        assertThat(tables).hasSize(1);
        assertThat(tables.get(0).getNumberOfRows()).isEqualTo(3); // header + 2 data rows
    }

    @Test
    void tableTypeShouldHaveNoVerticalBorders() {
        AcademicTable table = buildTable(AcademicTableType.TABLE, "ABNT Tabela",
                "| A | B |\n|---|---|\n| 1 | 2 |", null);
        XWPFDocument doc = new XWPFDocument();

        renderer.render(doc, new NumberedTable(table, 1));

        XWPFTable xTable = doc.getTables().get(0);
        CTTblBorders borders = xTable.getCTTbl().getTblPr().getTblBorders();
        assertThat(borders).isNotNull();
        assertThat(borders.getLeft().getVal()).isEqualTo(STBorder.NIL);
        assertThat(borders.getRight().getVal()).isEqualTo(STBorder.NIL);
        assertThat(borders.getInsideV().getVal()).isEqualTo(STBorder.NIL);
    }

    @Test
    void tableTypeShouldHaveHorizontalBorders() {
        AcademicTable table = buildTable(AcademicTableType.TABLE, "ABNT Tabela",
                "| A | B |\n|---|---|\n| 1 | 2 |", null);
        XWPFDocument doc = new XWPFDocument();

        renderer.render(doc, new NumberedTable(table, 1));

        XWPFTable xTable = doc.getTables().get(0);
        CTTblBorders borders = xTable.getCTTbl().getTblPr().getTblBorders();
        assertThat(borders.getTop().getVal()).isEqualTo(STBorder.SINGLE);
        assertThat(borders.getBottom().getVal()).isEqualTo(STBorder.SINGLE);
        assertThat(borders.getInsideH().getVal()).isEqualTo(STBorder.SINGLE);
    }

    @Test
    void quadroTypeShouldHaveAllBorders() {
        AcademicTable table = buildTable(AcademicTableType.QUADRO, "ABNT Quadro",
                "| A | B |\n|---|---|\n| 1 | 2 |", null);
        XWPFDocument doc = new XWPFDocument();

        renderer.render(doc, new NumberedTable(table, 1));

        XWPFTable xTable = doc.getTables().get(0);
        CTTblBorders borders = xTable.getCTTbl().getTblPr().getTblBorders();
        assertThat(borders.getTop().getVal()).isEqualTo(STBorder.SINGLE);
        assertThat(borders.getBottom().getVal()).isEqualTo(STBorder.SINGLE);
        assertThat(borders.getLeft().getVal()).isEqualTo(STBorder.SINGLE);
        assertThat(borders.getRight().getVal()).isEqualTo(STBorder.SINGLE);
        assertThat(borders.getInsideH().getVal()).isEqualTo(STBorder.SINGLE);
        assertThat(borders.getInsideV().getVal()).isEqualTo(STBorder.SINGLE);
    }

    @Test
    void shouldFallbackToBodyParagraphWhenContentIsNotMarkdownTable() {
        AcademicTable table = buildTable(AcademicTableType.TABLE, "Sem tabela markdown",
                "Apenas texto simples sem pipe.", null);
        XWPFDocument doc = new XWPFDocument();

        renderer.render(doc, new NumberedTable(table, 1));

        assertThat(doc.getTables()).isEmpty();
        String text = allParagraphText(doc);
        assertThat(text).contains("Apenas texto simples");
    }
}
