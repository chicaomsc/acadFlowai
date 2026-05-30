package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.export.docx.dto.NumberedFigure;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplate;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateRegistry;
import org.apache.poi.xwpf.usermodel.*;

import java.util.List;

public class FigureListRenderer {

    public void render(XWPFDocument doc, List<NumberedFigure> figures) {
        render(doc, figures, AcademicTemplateRegistry.ABNT_GENERIC);
    }

    public void render(XWPFDocument doc, List<NumberedFigure> figures, AcademicTemplate template) {
        if (figures.isEmpty()) return;

        DocxHelper.sectionHeading(doc, template.figureListLabel());

        for (NumberedFigure nf : figures) {
            XWPFParagraph p = doc.createParagraph();
            p.setStyle(DocxHelper.STYLE_BODY);
            p.setAlignment(ParagraphAlignment.LEFT);
            p.setSpacingBetween(DocxHelper.SPACING_BODY, LineSpacingRule.AUTO);
            p.setSpacingBefore(0);
            p.setSpacingAfter(0);
            p.setIndentationFirstLine(0);
            XWPFRun run = p.createRun();
            DocxHelper.applyFont(run, DocxHelper.FONT_BODY, false);
            run.setText("Figura " + nf.number() + " – " + nf.figure().getCaption());
        }
    }
}
