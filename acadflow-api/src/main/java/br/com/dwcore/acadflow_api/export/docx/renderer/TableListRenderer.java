package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType;
import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.export.docx.dto.NumberedTable;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplate;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateRegistry;
import org.apache.poi.xwpf.usermodel.*;

import java.util.List;

public class TableListRenderer {

    public boolean renderTableList(XWPFDocument doc, List<NumberedTable> tables) {
        return renderTableList(doc, tables, AcademicTemplateRegistry.ABNT_GENERIC);
    }

    public boolean renderTableList(XWPFDocument doc, List<NumberedTable> tables, AcademicTemplate template) {
        List<NumberedTable> filtered = tables.stream()
                .filter(nt -> nt.table().getType() == AcademicTableType.TABLE)
                .toList();
        if (filtered.isEmpty()) return false;

        DocxHelper.sectionHeading(doc, template.tableListLabel());
        for (NumberedTable nt : filtered) {
            renderEntry(doc, "Tabela " + nt.number() + " – " + nt.table().getTitle());
        }
        return true;
    }

    public boolean renderQuadroList(XWPFDocument doc, List<NumberedTable> tables) {
        return renderQuadroList(doc, tables, AcademicTemplateRegistry.ABNT_GENERIC);
    }

    public boolean renderQuadroList(XWPFDocument doc, List<NumberedTable> tables, AcademicTemplate template) {
        List<NumberedTable> filtered = tables.stream()
                .filter(nt -> nt.table().getType() == AcademicTableType.QUADRO)
                .toList();
        if (filtered.isEmpty()) return false;

        DocxHelper.sectionHeading(doc, template.quadroListLabel());
        for (NumberedTable nt : filtered) {
            renderEntry(doc, "Quadro " + nt.number() + " – " + nt.table().getTitle());
        }
        return true;
    }

    private void renderEntry(XWPFDocument doc, String text) {
        XWPFParagraph p = doc.createParagraph();
        p.setStyle(DocxHelper.STYLE_BODY);
        p.setAlignment(ParagraphAlignment.LEFT);
        p.setSpacingBetween(DocxHelper.SPACING_BODY, LineSpacingRule.AUTO);
        p.setSpacingBefore(0);
        p.setSpacingAfter(0);
        p.setIndentationFirstLine(0);
        XWPFRun run = p.createRun();
        DocxHelper.applyFont(run, DocxHelper.FONT_BODY, false);
        run.setText(text);
    }
}
