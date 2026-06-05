package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTable;
import br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType;
import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.export.docx.dto.NumberedTable;
import org.apache.poi.xwpf.usermodel.*;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.*;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;

public class TableRenderer {

    private static final int TABLE_WIDTH_TWIPS = 9072; // 16 cm text area

    public void render(XWPFDocument doc, NumberedTable nt) {
        AcademicTable table = nt.table();
        String typeLabel = table.getType() == AcademicTableType.TABLE ? "Tabela" : "Quadro";

        // Title above table (caption style)
        DocxHelper.captionParagraph(doc, typeLabel + " " + nt.number() + " – " + table.getTitle());

        // Parse markdown content into rows
        List<List<String>> rows = parseMarkdownTable(table.getContent());

        if (rows.isEmpty()) {
            DocxHelper.bodyParagraph(doc, table.getContent());
        } else {
            int numCols = rows.stream().mapToInt(List::size).max().orElse(1);
            XWPFTable xTable = doc.createTable(rows.size(), numCols);

            applyBorders(xTable, table.getType());
            setTableWidth(xTable, numCols);

            for (int r = 0; r < rows.size(); r++) {
                XWPFTableRow row = xTable.getRow(r);
                List<String> cells = rows.get(r);
                boolean isHeader = r == 0;
                for (int c = 0; c < numCols; c++) {
                    XWPFTableCell cell = row.getCell(c);
                    String text = c < cells.size() ? cells.get(c) : "";
                    XWPFParagraph cellPara = cell.getParagraphs().get(0);
                    cellPara.setAlignment(ParagraphAlignment.LEFT);
                    cellPara.setSpacingBetween(DocxHelper.SPACING_SINGLE, LineSpacingRule.AUTO);
                    XWPFRun run = cellPara.createRun();
                    DocxHelper.applyFont(run, DocxHelper.FONT_SMALL, isHeader);
                    run.setText(text);
                }
            }
        }

        // Source below table (caption style)
        if (table.getSourceText() != null && !table.getSourceText().isBlank()) {
            DocxHelper.captionParagraph(doc, "Fonte: " + table.getSourceText());
        }

        // Spacer after table block
        XWPFParagraph spacer = doc.createParagraph();
        spacer.setStyle(DocxHelper.STYLE_BODY);
        spacer.setSpacingBefore(0);
        spacer.setSpacingAfter(0);
        spacer.setIndentationFirstLine(0);
        XWPFRun spacerRun = spacer.createRun();
        DocxHelper.applyFont(spacerRun, DocxHelper.FONT_BODY, false);
        spacerRun.setText("");
    }

    private void applyBorders(XWPFTable xTable, AcademicTableType type) {
        CTTblPr tblPr = xTable.getCTTbl().getTblPr();
        if (tblPr == null) tblPr = xTable.getCTTbl().addNewTblPr();

        // Remove any applied table style so explicit tblBorders take full precedence
        if (tblPr.isSetTblStyle()) tblPr.unsetTblStyle();

        CTTblBorders borders = tblPr.isSetTblBorders()
                ? tblPr.getTblBorders()
                : tblPr.addNewTblBorders();

        // Horizontal borders — always present for both TABLE and QUADRO
        setBorder(borders.isSetTop()     ? borders.getTop()     : borders.addNewTop(),     true);
        setBorder(borders.isSetBottom()  ? borders.getBottom()  : borders.addNewBottom(),  true);
        setBorder(borders.isSetInsideH() ? borders.getInsideH() : borders.addNewInsideH(), true);

        // Vertical borders — only for QUADRO (all sides); TABLE has open sides
        boolean hasVertical = type == AcademicTableType.QUADRO;
        setBorder(borders.isSetLeft()    ? borders.getLeft()    : borders.addNewLeft(),    hasVertical);
        setBorder(borders.isSetRight()   ? borders.getRight()   : borders.addNewRight(),   hasVertical);
        setBorder(borders.isSetInsideV() ? borders.getInsideV() : borders.addNewInsideV(), hasVertical);
    }

    private void setBorder(CTBorder border, boolean visible) {
        if (visible) {
            border.setVal(STBorder.SINGLE);
            border.setSz(BigInteger.valueOf(4)); // 0.5 pt
            border.setColor("000000");
        } else {
            border.setVal(STBorder.NIL);
        }
    }

    private void setTableWidth(XWPFTable xTable, int numCols) {
        CTTblPr tblPr = xTable.getCTTbl().getTblPr();
        if (tblPr == null) tblPr = xTable.getCTTbl().addNewTblPr();
        CTTblWidth tblW = tblPr.isSetTblW() ? tblPr.getTblW() : tblPr.addNewTblW();
        tblW.setType(STTblWidth.DXA);
        tblW.setW(BigInteger.valueOf(TABLE_WIDTH_TWIPS));

        // Equal column widths
        int colWidth = TABLE_WIDTH_TWIPS / numCols;
        for (XWPFTableRow row : xTable.getRows()) {
            for (XWPFTableCell cell : row.getTableCells()) {
                CTTcPr tcPr = cell.getCTTc().isSetTcPr()
                        ? cell.getCTTc().getTcPr()
                        : cell.getCTTc().addNewTcPr();
                CTTblWidth tcW = tcPr.isSetTcW() ? tcPr.getTcW() : tcPr.addNewTcW();
                tcW.setType(STTblWidth.DXA);
                tcW.setW(BigInteger.valueOf(colWidth));
            }
        }
    }

    private List<List<String>> parseMarkdownTable(String content) {
        List<List<String>> rows = new ArrayList<>();
        if (content == null) return rows;
        for (String line : content.split("\\n")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;
            if (!trimmed.contains("|")) continue; // not a table row
            if (trimmed.matches("[|\\-:\\s]+")) continue; // separator row
            String[] parts = trimmed.split("\\|", -1);
            List<String> cells = new ArrayList<>();
            int start = (parts.length > 0 && parts[0].trim().isEmpty()) ? 1 : 0;
            int end = (parts.length > 0 && parts[parts.length - 1].trim().isEmpty())
                    ? parts.length - 1 : parts.length;
            for (int i = start; i < end; i++) {
                cells.add(parts[i].trim());
            }
            if (!cells.isEmpty()) rows.add(cells);
        }
        return rows;
    }
}
