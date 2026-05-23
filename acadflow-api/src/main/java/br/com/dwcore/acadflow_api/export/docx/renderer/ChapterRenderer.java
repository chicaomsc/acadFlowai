package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.citation.domain.CitationType;
import br.com.dwcore.acadflow_api.citation.service.CitationFormatter;
import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import org.apache.poi.xwpf.usermodel.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ChapterRenderer {

    private static final Pattern CITE_PATTERN = Pattern.compile(
            "\\[\\[@CITE:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\]\\]"
    );

    public void render(XWPFDocument doc, List<Chapter> chapters) {
        render(doc, chapters, Map.of());
    }

    public void render(XWPFDocument doc, List<Chapter> chapters, Map<UUID, Citation> citationLookup) {
        int number = 1;
        for (Chapter chapter : chapters) {
            if (chapter.getType() == ChapterType.REFERENCES) continue;

            DocxHelper.pageBreak(doc);

            String heading = number + "  " + chapter.getTitle().toUpperCase();
            DocxHelper.sectionHeading(doc, heading);
            number++;

            String content = chapter.getContent();
            if (content != null && !content.isBlank()) {
                for (String block : content.split("\\n\\n+")) {
                    String trimmedBlock = block.trim();
                    if (trimmedBlock.isEmpty()) continue;
                    renderBlock(doc, trimmedBlock, citationLookup);
                }
            }
        }
    }

    private void renderBlock(XWPFDocument doc, String block, Map<UUID, Citation> citationLookup) {
        if (citationLookup.isEmpty() || !CITE_PATTERN.matcher(block).find()) {
            renderPlainBlock(doc, block);
            return;
        }

        List<Object> tokens = tokenize(block, citationLookup);
        XWPFParagraph current = null;

        for (Object token : tokens) {
            if (token instanceof Citation c && c.getType() == CitationType.DIRECT_LONG) {
                current = null;
                renderDirectLongBlock(doc, c);
            } else {
                if (current == null) current = createBodyParagraph(doc);
                if (token instanceof String text) {
                    appendTextWithSoftBreaks(current, text);
                } else if (token instanceof Citation c) {
                    XWPFRun run = current.createRun();
                    DocxHelper.applyFont(run, 12, false);
                    run.setText(CitationFormatter.format(c));
                }
            }
        }
    }

    private void renderPlainBlock(XWPFDocument doc, String block) {
        XWPFParagraph p = createBodyParagraph(doc);
        String[] lines = block.split("\\n");
        for (int i = 0; i < lines.length; i++) {
            XWPFRun run = p.createRun();
            DocxHelper.applyFont(run, 12, false);
            run.setText(lines[i].trim());
            if (i < lines.length - 1) {
                run.addBreak();
            }
        }
    }

    private void renderDirectLongBlock(XWPFDocument doc, Citation citation) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.BOTH);
        p.setSpacingBetween(1.0, LineSpacingRule.AUTO);
        p.setIndentationLeft(2268); // 4 cm in twips
        p.setSpacingBefore(240);
        p.setSpacingAfter(240);

        String quoted = citation.getQuotedText() != null ? citation.getQuotedText() : "";
        XWPFRun textRun = p.createRun();
        DocxHelper.applyFont(textRun, 10, false);
        textRun.setText(quoted + " ");

        XWPFRun refRun = p.createRun();
        DocxHelper.applyFont(refRun, 10, false);
        refRun.setText(CitationFormatter.format(citation));
    }

    private List<Object> tokenize(String block, Map<UUID, Citation> citationLookup) {
        List<Object> tokens = new ArrayList<>();
        Matcher m = CITE_PATTERN.matcher(block);
        int last = 0;

        while (m.find()) {
            if (m.start() > last) {
                tokens.add(block.substring(last, m.start()));
            }
            UUID id = UUID.fromString(m.group(1));
            Citation citation = citationLookup.get(id);
            if (citation != null) {
                tokens.add(citation);
            } else {
                tokens.add(m.group(0)); // keep marker as literal if not found
            }
            last = m.end();
        }

        if (last < block.length()) {
            tokens.add(block.substring(last));
        }
        return tokens;
    }

    private XWPFParagraph createBodyParagraph(XWPFDocument doc) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.BOTH);
        p.setSpacingBetween(1.5, LineSpacingRule.AUTO);
        p.setIndentationFirstLine(709); // 1.25 cm
        return p;
    }

    private void appendTextWithSoftBreaks(XWPFParagraph p, String text) {
        String[] lines = text.split("\\n");
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty() && i == 0) continue;
            XWPFRun run = p.createRun();
            DocxHelper.applyFont(run, 12, false);
            run.setText(line);
            if (i < lines.length - 1) {
                run.addBreak();
            }
        }
    }
}
