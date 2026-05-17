package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import org.apache.poi.xwpf.usermodel.*;

import java.util.List;

public class SummaryRenderer {

    public void render(XWPFDocument doc, List<Chapter> chapters) {
        DocxHelper.sectionHeading(doc, "Sumário");
        DocxHelper.emptyLine(doc);

        int number = 1;
        for (Chapter chapter : chapters) {
            if (chapter.getType() == ChapterType.REFERENCES) {
                addSummaryEntry(doc, chapter.getTitle().toUpperCase(), false);
            } else {
                addSummaryEntry(doc, number + "  " + chapter.getTitle().toUpperCase(), false);
                number++;
            }
        }
    }

    private void addSummaryEntry(XWPFDocument doc, String text, boolean bold) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.LEFT);
        p.setSpacingBetween(1.5, LineSpacingRule.AUTO);
        XWPFRun run = p.createRun();
        DocxHelper.applyFont(run, 12, bold);
        run.setText(text);
    }
}
