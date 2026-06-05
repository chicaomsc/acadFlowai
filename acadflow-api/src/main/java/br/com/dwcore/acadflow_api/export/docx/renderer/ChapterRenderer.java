package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.citation.domain.CitationType;
import br.com.dwcore.acadflow_api.citation.service.CitationFormatter;
import br.com.dwcore.acadflow_api.export.docx.AcademicNumberingService;
import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.export.docx.DocumentStructureBuilder;
import br.com.dwcore.acadflow_api.export.docx.dto.CrossRef;
import br.com.dwcore.acadflow_api.export.docx.dto.NumberedFigure;
import br.com.dwcore.acadflow_api.export.docx.dto.NumberedTable;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplate;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateRegistry;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.xwpf.usermodel.*;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ChapterRenderer {

    private static final String UUID_PATTERN =
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

    private static final Pattern CITE_PATTERN = Pattern.compile(
            "\\[\\[@CITE:(" + UUID_PATTERN + ")\\]\\]"
    );

    private static final Pattern FIG_PATTERN = Pattern.compile(
            "\\[\\[@FIG:(" + UUID_PATTERN + ")\\]\\]"
    );

    private static final Pattern TABLE_QUADRO_PATTERN = Pattern.compile(
            "\\[\\[@(?:TABLE|QUADRO):(" + UUID_PATTERN + ")\\]\\]"
    );

    private static final Pattern XREF_PATTERN = Pattern.compile(
            "\\[\\[@XREF:(?:FIG|TABLE|QUADRO|CHAPTER|SECTION):" + UUID_PATTERN + "\\]\\]"
    );

    private final TableRenderer tableRenderer = new TableRenderer();

    // Text area width: A4 (21cm) - left margin (3cm) - right margin (2cm) = 16cm
    private static final long TEXT_WIDTH_EMU = 16L * 360_000L;

    public void render(XWPFDocument doc, List<Chapter> chapters) {
        render(doc, chapters, Map.of(), Map.of());
    }

    public void render(XWPFDocument doc, List<Chapter> chapters, Map<UUID, Citation> citationLookup) {
        render(doc, chapters, citationLookup, Map.of());
    }

    public void render(XWPFDocument doc, List<Chapter> chapters,
                       Map<UUID, Citation> citationLookup,
                       Map<UUID, NumberedFigure> numberedFigureLookup) {
        render(doc, chapters, citationLookup, numberedFigureLookup, AcademicTemplateRegistry.ABNT_GENERIC);
    }

    public void render(XWPFDocument doc, List<Chapter> chapters,
                       Map<UUID, Citation> citationLookup,
                       Map<UUID, NumberedFigure> numberedFigureLookup,
                       AcademicTemplate template) {
        render(doc, chapters, citationLookup, numberedFigureLookup, Map.of(), template);
    }

    public void render(XWPFDocument doc, List<Chapter> chapters,
                       Map<UUID, Citation> citationLookup,
                       Map<UUID, NumberedFigure> numberedFigureLookup,
                       Map<UUID, NumberedTable> numberedTableLookup,
                       AcademicTemplate template) {
        render(doc, chapters, citationLookup, numberedFigureLookup, numberedTableLookup, template, Map.of());
    }

    public void render(XWPFDocument doc, List<Chapter> chapters,
                       Map<UUID, Citation> citationLookup,
                       Map<UUID, NumberedFigure> numberedFigureLookup,
                       Map<UUID, NumberedTable> numberedTableLookup,
                       AcademicTemplate template,
                       Map<UUID, String> xrefLookup) {

        AcademicNumberingService numbering = new AcademicNumberingService();
        Map<UUID, Integer> chapterNumbers = numbering.computeChapterNumbers(chapters);
        Map<UUID, String> sectionNumbers = numbering.computeSectionNumbers(chapters, chapterNumbers);

        int bookmarkId = 0;
        DocumentStructureBuilder builder = new DocumentStructureBuilder();
        for (DocumentStructureBuilder.ChapterNode node : builder.build(chapters)) {
            Chapter chapter = node.chapter();
            if (chapter.getType() == ChapterType.REFERENCES) continue;

            Integer chNum = chapterNumbers.get(chapter.getId());
            DocxHelper.pageBreak(doc);
            XWPFParagraph headingPara = DocxHelper.sectionHeading(doc, chNum + "  " + chapter.getTitle());
            DocxHelper.addBookmark(headingPara, DocxHelper.bookmarkName(chapter.getId()), bookmarkId++);
            renderContent(doc, chapter, citationLookup, numberedFigureLookup, numberedTableLookup, xrefLookup);

            for (Chapter section : node.sections()) {
                String sNum = sectionNumbers.getOrDefault(section.getId(), "?");
                XWPFParagraph sectionPara = DocxHelper.subSectionHeading(doc, sNum + "  " + section.getTitle());
                DocxHelper.addBookmark(sectionPara, DocxHelper.bookmarkName(section.getId()), bookmarkId++);
                renderContent(doc, section, citationLookup, numberedFigureLookup, numberedTableLookup, xrefLookup);
            }
        }
    }

    private void renderContent(XWPFDocument doc, Chapter chapter,
                                Map<UUID, Citation> citationLookup,
                                Map<UUID, NumberedFigure> numberedFigureLookup,
                                Map<UUID, NumberedTable> numberedTableLookup,
                                Map<UUID, String> xrefLookup) {
        String content = chapter.getContent();
        if (content != null && !content.isBlank()) {
            for (String block : content.split("\\n\\n+")) {
                String trimmedBlock = block.trim();
                if (trimmedBlock.isEmpty()) continue;
                renderBlock(doc, trimmedBlock, citationLookup, numberedFigureLookup,
                        numberedTableLookup, xrefLookup);
            }
        }
    }

    private void renderBlock(XWPFDocument doc, String block,
                              Map<UUID, Citation> citationLookup,
                              Map<UUID, NumberedFigure> numberedFigureLookup,
                              Map<UUID, NumberedTable> numberedTableLookup,
                              Map<UUID, String> xrefLookup) {
        boolean hasCite  = !citationLookup.isEmpty() && CITE_PATTERN.matcher(block).find();
        boolean hasFig   = !numberedFigureLookup.isEmpty() && FIG_PATTERN.matcher(block).find();
        boolean hasTable = !numberedTableLookup.isEmpty() && TABLE_QUADRO_PATTERN.matcher(block).find();
        boolean hasXref  = XREF_PATTERN.matcher(block).find();

        if (!hasCite && !hasFig && !hasTable && !hasXref) {
            renderPlainBlock(doc, block);
            return;
        }

        List<Object> tokens = tokenize(block, citationLookup, numberedFigureLookup,
                numberedTableLookup, xrefLookup);
        XWPFParagraph current = null;

        for (Object token : tokens) {
            if (token instanceof Citation c && c.getType() == CitationType.DIRECT_LONG) {
                current = null;
                renderDirectLongBlock(doc, c);
            } else if (token instanceof NumberedFigure nf) {
                current = null;
                renderFigureBlock(doc, nf);
            } else if (token instanceof NumberedTable nt) {
                current = null;
                tableRenderer.render(doc, nt);
            } else {
                if (current == null) current = createBodyParagraph(doc);
                if (token instanceof String text) {
                    appendTextWithSoftBreaks(current, text);
                } else if (token instanceof Citation c) {
                    XWPFRun run = current.createRun();
                    DocxHelper.applyFont(run, DocxHelper.FONT_BODY, false);
                    run.setText(CitationFormatter.format(c));
                } else if (token instanceof CrossRef xref) {
                    XWPFRun run = current.createRun();
                    DocxHelper.applyFont(run, DocxHelper.FONT_BODY, false);
                    run.setText(xref.displayText());
                }
            }
        }
    }

    private void renderPlainBlock(XWPFDocument doc, String block) {
        XWPFParagraph p = createBodyParagraph(doc);
        String[] lines = block.split("\\n");
        for (int i = 0; i < lines.length; i++) {
            XWPFRun run = p.createRun();
            DocxHelper.applyFont(run, DocxHelper.FONT_BODY, false);
            run.setText(lines[i].trim());
            if (i < lines.length - 1) {
                run.addBreak();
            }
        }
    }

    private void renderDirectLongBlock(XWPFDocument doc, Citation citation) {
        XWPFParagraph p = doc.createParagraph();
        p.setStyle(DocxHelper.STYLE_QUOTE);
        p.setAlignment(ParagraphAlignment.BOTH);
        p.setSpacingBetween(DocxHelper.SPACING_SINGLE, LineSpacingRule.AUTO);
        p.setIndentationLeft(DocxHelper.INDENT_LONG_CITE);
        p.setSpacingBefore(DocxHelper.SPC_AFTER_HEADING);
        p.setSpacingAfter(DocxHelper.SPC_AFTER_HEADING);

        String quoted = citation.getQuotedText() != null ? citation.getQuotedText() : "";
        XWPFRun textRun = p.createRun();
        DocxHelper.applyFont(textRun, DocxHelper.FONT_SMALL, false);
        textRun.setText(quoted + " ");

        XWPFRun refRun = p.createRun();
        DocxHelper.applyFont(refRun, DocxHelper.FONT_SMALL, false);
        refRun.setText(CitationFormatter.format(citation));
    }

    void renderFigureBlock(XWPFDocument doc, NumberedFigure nf) {
        int pictureType = nf.figure().getMimeType().contains("png")
                ? XWPFDocument.PICTURE_TYPE_PNG
                : XWPFDocument.PICTURE_TYPE_JPEG;

        int widthEMU  = (int)(TEXT_WIDTH_EMU * nf.figure().getWidthPercent() / 100L);
        int heightEMU = calculateHeightEMU(nf.imageData(), widthEMU);

        // Image paragraph (centered)
        XWPFParagraph imagePara = doc.createParagraph();
        imagePara.setAlignment(ParagraphAlignment.CENTER);
        imagePara.setSpacingBetween(DocxHelper.SPACING_SINGLE, LineSpacingRule.AUTO);
        XWPFRun imageRun = imagePara.createRun();

        try {
            imageRun.addPicture(
                    new ByteArrayInputStream(nf.imageData()),
                    pictureType,
                    nf.figure().getOriginalFilename() != null ? nf.figure().getOriginalFilename() : "figura",
                    widthEMU,
                    heightEMU
            );
        } catch (InvalidFormatException | IOException e) {
            DocxHelper.applyFont(imageRun, DocxHelper.FONT_BODY, false);
            imageRun.setText("[Figura não disponível]");
        }

        // Caption: "Figura N – caption"
        DocxHelper.captionParagraph(doc, "Figura " + nf.number() + " – " + nf.figure().getCaption());

        // Source line (optional)
        if (nf.figure().getSourceText() != null && !nf.figure().getSourceText().isBlank()) {
            DocxHelper.captionParagraph(doc, "Fonte: " + nf.figure().getSourceText());
        }

        // Spacing after figure block
        XWPFParagraph spacer = doc.createParagraph();
        spacer.setStyle(DocxHelper.STYLE_BODY);
        spacer.setSpacingBefore(0);
        spacer.setSpacingAfter(0);
        spacer.setIndentationFirstLine(0);
        XWPFRun spacerRun = spacer.createRun();
        DocxHelper.applyFont(spacerRun, DocxHelper.FONT_BODY, false);
        spacerRun.setText("");
    }

    private int calculateHeightEMU(byte[] imageData, int widthEMU) {
        try {
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(imageData));
            if (img != null && img.getWidth() > 0) {
                return (int)((long)widthEMU * img.getHeight() / img.getWidth());
            }
        } catch (IOException ignored) {}
        return widthEMU * 3 / 4; // 4:3 fallback
    }

    private List<Object> tokenize(String block,
                                   Map<UUID, Citation> citationLookup,
                                   Map<UUID, NumberedFigure> numberedFigureLookup,
                                   Map<UUID, NumberedTable> numberedTableLookup,
                                   Map<UUID, String> xrefLookup) {
        Pattern combined = Pattern.compile(
                "\\[\\[@(CITE|FIG|TABLE|QUADRO|XREF:FIG|XREF:TABLE|XREF:QUADRO|XREF:CHAPTER|XREF:SECTION):(" + UUID_PATTERN + ")\\]\\]"
        );

        List<Object> tokens = new ArrayList<>();
        Matcher m = combined.matcher(block);
        int last = 0;

        while (m.find()) {
            if (m.start() > last) {
                tokens.add(block.substring(last, m.start()));
            }
            String type = m.group(1);
            UUID id = UUID.fromString(m.group(2));

            if ("CITE".equals(type)) {
                Citation citation = citationLookup.get(id);
                tokens.add(citation != null ? citation : m.group(0));
            } else if ("FIG".equals(type)) {
                NumberedFigure nf = numberedFigureLookup.get(id);
                tokens.add(nf != null ? nf : m.group(0));
            } else if (type.startsWith("XREF:")) {
                String displayText = xrefLookup.getOrDefault(id, "[referência inválida]");
                tokens.add(new CrossRef(displayText));
            } else {
                NumberedTable nt = numberedTableLookup.get(id);
                tokens.add(nt != null ? nt : m.group(0));
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
        p.setStyle(DocxHelper.STYLE_BODY);
        p.setAlignment(ParagraphAlignment.BOTH);
        p.setSpacingBetween(DocxHelper.SPACING_BODY, LineSpacingRule.AUTO);
        p.setSpacingBefore(0);
        p.setSpacingAfter(0);
        p.setIndentationFirstLine(DocxHelper.INDENT_PARAGRAPH);
        return p;
    }

    private void appendTextWithSoftBreaks(XWPFParagraph p, String text) {
        String[] lines = text.split("\\n");
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty() && i == 0) continue;
            XWPFRun run = p.createRun();
            DocxHelper.applyFont(run, DocxHelper.FONT_BODY, false);
            run.setText(line);
            if (i < lines.length - 1) {
                run.addBreak();
            }
        }
    }
}
