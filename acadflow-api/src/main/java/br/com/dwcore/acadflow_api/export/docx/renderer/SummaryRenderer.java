package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.export.docx.AcademicNumberingService;
import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.export.docx.DocumentStructureBuilder;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplate;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateRegistry;
import org.apache.poi.xwpf.usermodel.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public class SummaryRenderer {

    public void render(XWPFDocument doc, List<Chapter> chapters) {
        render(doc, chapters, AcademicTemplateRegistry.ABNT_GENERIC);
    }

    public void render(XWPFDocument doc, List<Chapter> chapters, AcademicTemplate template) {
        DocxHelper.sectionHeading(doc, template.summaryLabel());

        AcademicNumberingService numbering = new AcademicNumberingService();
        Map<UUID, Integer> chapterNumbers = numbering.computeChapterNumbers(chapters);
        Map<UUID, String> sectionNumbers = numbering.computeSectionNumbers(chapters, chapterNumbers);

        for (DocumentStructureBuilder.ChapterNode node : new DocumentStructureBuilder().build(chapters)) {
            Chapter chapter = node.chapter();
            if (chapter.getType() == ChapterType.REFERENCES) {
                addEntry(doc, chapter.getTitle().toUpperCase());
            } else {
                int num = chapterNumbers.getOrDefault(chapter.getId(), 0);
                addEntry(doc, num + "  " + chapter.getTitle().toUpperCase());
                for (Chapter section : node.sections()) {
                    String sNum = sectionNumbers.getOrDefault(section.getId(), "?");
                    addSectionEntry(doc, sNum + "  " + section.getTitle());
                }
            }
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

    private void addSectionEntry(XWPFDocument doc, String text) {
        XWPFParagraph p = doc.createParagraph();
        p.setStyle(DocxHelper.STYLE_BODY);
        p.setAlignment(ParagraphAlignment.LEFT);
        p.setSpacingBetween(DocxHelper.SPACING_BODY, LineSpacingRule.AUTO);
        p.setSpacingBefore(0);
        p.setSpacingAfter(0);
        p.setIndentationFirstLine(0);
        p.setIndentationLeft(DocxHelper.INDENT_PARAGRAPH);
        XWPFRun run = p.createRun();
        DocxHelper.applyFont(run, DocxHelper.FONT_BODY, false);
        run.setText(text);
    }
}
