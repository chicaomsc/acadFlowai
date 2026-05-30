package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplate;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateRegistry;
import org.apache.poi.xwpf.usermodel.*;

import java.util.List;

public class SummaryRenderer {

    public void render(XWPFDocument doc, List<Chapter> chapters) {
        render(doc, chapters, AcademicTemplateRegistry.ABNT_GENERIC);
    }

    public void render(XWPFDocument doc, List<Chapter> chapters, AcademicTemplate template) {
        DocxHelper.sectionHeading(doc, template.summaryLabel());

        int number = 1;
        for (Chapter chapter : chapters) {
            String entry;
            if (chapter.getType() == ChapterType.REFERENCES) {
                entry = chapter.getTitle().toUpperCase();
            } else {
                entry = number + "  " + chapter.getTitle().toUpperCase();
                number++;
            }
            addEntry(doc, entry);
        }
    }

    private void addEntry(XWPFDocument doc, String text) {
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
