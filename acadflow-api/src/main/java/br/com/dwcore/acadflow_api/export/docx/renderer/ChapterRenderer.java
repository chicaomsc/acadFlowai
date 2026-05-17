package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import org.apache.poi.xwpf.usermodel.*;

import java.util.List;

public class ChapterRenderer {

    public void render(XWPFDocument doc, List<Chapter> chapters) {
        int number = 1;
        for (Chapter chapter : chapters) {
            if (chapter.getType() == ChapterType.REFERENCES) continue;

            DocxHelper.pageBreak(doc);

            String heading = number + "  " + chapter.getTitle().toUpperCase();
            DocxHelper.sectionHeading(doc, heading);
            number++;

            String content = chapter.getContent();
            if (content != null && !content.isBlank()) {
                // Split on 2+ consecutive newlines → separate DOCX paragraphs
                for (String block : content.split("\\n\\n+")) {
                    String trimmedBlock = block.trim();
                    if (trimmedBlock.isEmpty()) continue;

                    XWPFParagraph p = doc.createParagraph();
                    p.setAlignment(ParagraphAlignment.BOTH);
                    p.setSpacingBetween(1.5, LineSpacingRule.AUTO);
                    p.setIndentationFirstLine(709); // 1.25 cm

                    // Single newlines within a block become soft returns (Shift+Enter)
                    String[] lines = trimmedBlock.split("\\n");
                    for (int i = 0; i < lines.length; i++) {
                        XWPFRun run = p.createRun();
                        DocxHelper.applyFont(run, 12, false);
                        run.setText(lines[i].trim());
                        if (i < lines.length - 1) {
                            run.addBreak(); // soft return within the same paragraph
                        }
                    }
                }
            }
        }
    }
}
