package br.com.dwcore.acadflow_api.export.docx;

import org.apache.poi.xwpf.usermodel.*;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.*;

import java.math.BigInteger;

public final class DocxHelper {

    // ── Typography ────────────────────────────────────────────────────────────
    public static final String FONT         = "Times New Roman";
    public static final int    FONT_BODY    = 12;   // body text, headings
    public static final int    FONT_SMALL   = 10;   // captions, long citations

    // ── Line spacing ─────────────────────────────────────────────────────────
    public static final double SPACING_BODY   = 1.5;
    public static final double SPACING_SINGLE = 1.0;

    // ── Indentation (twips: 1 cm ≈ 567 twips) ────────────────────────────────
    public static final int INDENT_PARAGRAPH   = 709;   // 1.25 cm first-line
    public static final int INDENT_LONG_CITE   = 2268;  // 4 cm left (long citations)
    public static final int INDENT_NATURE_STMT = 4252;  // 7.5 cm left (title-page statement)
    public static final int INDENT_REF_HANGING = 720;   // hanging indent for references

    // ── Paragraph spacing (twips: 1 pt = 20 twips) ───────────────────────────
    public static final int SPC_AFTER_REF      = 240;   // 12 pt after each reference
    public static final int SPC_BEFORE_HEADING = 480;   // 24 pt before section heading
    public static final int SPC_AFTER_HEADING  = 240;   // 12 pt after section heading

    // ── Named paragraph style IDs ─────────────────────────────────────────────
    public static final String STYLE_BODY         = "ABNTBody";
    public static final String STYLE_HEADING      = "ABNTHeading1";
    public static final String STYLE_COVER_TOP    = "ABNTCoverTop";
    public static final String STYLE_COVER_CENTER = "ABNTCoverCenter";
    public static final String STYLE_COVER_BOTTOM = "ABNTCoverBottom";
    public static final String STYLE_CAPTION      = "ABNTCaption";
    public static final String STYLE_QUOTE        = "ABNTQuoteLong";
    public static final String STYLE_REF          = "ABNTReference";
    public static final String STYLE_TABLE        = "ABNTTable";

    // ── Page layout — A4 portrait, ABNT NBR 14724:2011 margins ───────────────
    // Twips = twentieths of a point; 1 cm = 566.93 twips ≈ 567.
    // A4: 21 cm × 29.7 cm → usable height = 29.7 − 3 − 2 = 24.7 cm ≈ 14 004 twips.
    public static final int PAGE_WIDTH_A4   = 11906; // 21 cm
    public static final int PAGE_HEIGHT_A4  = 16838; // 29.7 cm
    public static final int MARGIN_TOP      = 1701;  // 3 cm
    public static final int MARGIN_LEFT     = 1701;  // 3 cm
    public static final int MARGIN_BOTTOM   = 1134;  // 2 cm
    public static final int MARGIN_RIGHT    = 1134;  // 2 cm

    // ── Cover page vertical rhythm (twips) ───────────────────────────────────
    // Layout within 14 004 twips usable height:
    //   institution + course : ~480 twips (24 pt from top margin)
    //   author               : ~3 800 twips
    //   title                : ~6 400 twips
    //   city + year          : ~12 000 – 13 500 twips (near bottom margin)
    public static final int SPC_COVER_TOP      = 480;   // 24 pt — small gap from top margin
    public static final int SPC_COVER_NEARBY   = 240;   // 12 pt — tight pair (course, subtitle, year)
    public static final int SPC_COVER_GAP      = 2268;  // 4 cm  — between main blocks
    public static final int SPC_COVER_CITY_GAP = 5670;  // 10 cm — pushes city/year to near-bottom

    private DocxHelper() {}

    // ── Paragraph factories ───────────────────────────────────────────────────

    public static XWPFParagraph centeredParagraph(XWPFDocument doc, String text, int pts, boolean bold) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        p.setSpacingBetween(SPACING_BODY, LineSpacingRule.AUTO);
        XWPFRun run = p.createRun();
        applyFont(run, pts, bold);
        run.setText(text != null ? text : "");
        return p;
    }

    public static XWPFParagraph bodyParagraph(XWPFDocument doc, String text) {
        XWPFParagraph p = doc.createParagraph();
        p.setStyle(STYLE_BODY);
        p.setAlignment(ParagraphAlignment.BOTH);
        p.setSpacingBetween(SPACING_BODY, LineSpacingRule.AUTO);
        p.setSpacingBefore(0);
        p.setSpacingAfter(0);
        p.setIndentationFirstLine(INDENT_PARAGRAPH);
        XWPFRun run = p.createRun();
        applyFont(run, FONT_BODY, false);
        run.setText(text != null ? text : "");
        return p;
    }

    public static XWPFParagraph sectionHeading(XWPFDocument doc, String text) {
        XWPFParagraph p = doc.createParagraph();
        p.setStyle(STYLE_HEADING);
        p.setAlignment(ParagraphAlignment.LEFT);
        p.setSpacingBetween(SPACING_BODY, LineSpacingRule.AUTO);
        p.setSpacingBefore(SPC_BEFORE_HEADING);
        p.setSpacingAfter(SPC_AFTER_HEADING);
        XWPFRun run = p.createRun();
        applyFont(run, FONT_BODY, true);
        run.setText(text != null ? text.toUpperCase() : "");
        return p;
    }

    /** 10 pt centered paragraph — for figure captions and source lines. */
    public static XWPFParagraph captionParagraph(XWPFDocument doc, String text) {
        XWPFParagraph p = doc.createParagraph();
        p.setStyle(STYLE_CAPTION);
        p.setAlignment(ParagraphAlignment.CENTER);
        p.setSpacingBetween(SPACING_SINGLE, LineSpacingRule.AUTO);
        XWPFRun run = p.createRun();
        applyFont(run, FONT_SMALL, false);
        run.setText(text != null ? text : "");
        return p;
    }

    public static XWPFParagraph emptyLine(XWPFDocument doc) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun run = p.createRun();
        applyFont(run, FONT_BODY, false);
        run.setText("");
        return p;
    }

    public static void pageBreak(XWPFDocument doc) {
        XWPFParagraph p = doc.createParagraph();
        p.setPageBreak(true);
    }

    public static void setupPageMargins(XWPFDocument doc) {
        CTBody body = doc.getDocument().getBody();
        CTSectPr sectPr = body.isSetSectPr() ? body.getSectPr() : body.addNewSectPr();

        // A4 portrait — explicit for compatibility with Word, Google Docs, LibreOffice
        CTPageSz pgSz = sectPr.isSetPgSz() ? sectPr.getPgSz() : sectPr.addNewPgSz();
        pgSz.setW(BigInteger.valueOf(PAGE_WIDTH_A4));
        pgSz.setH(BigInteger.valueOf(PAGE_HEIGHT_A4));
        pgSz.setOrient(STPageOrientation.PORTRAIT);

        // ABNT NBR 14724: top=3cm, left=3cm, bottom=2cm, right=2cm
        CTPageMar pgMar = sectPr.isSetPgMar() ? sectPr.getPgMar() : sectPr.addNewPgMar();
        pgMar.setTop(BigInteger.valueOf(MARGIN_TOP));
        pgMar.setLeft(BigInteger.valueOf(MARGIN_LEFT));
        pgMar.setBottom(BigInteger.valueOf(MARGIN_BOTTOM));
        pgMar.setRight(BigInteger.valueOf(MARGIN_RIGHT));
    }

    /**
     * Apply font to a run. {@code pts} is the desired point size (e.g. 12).
     * Uses setFontSize(double) which takes points and internally converts to half-points.
     */
    public static void applyFont(XWPFRun run, int pts, boolean bold) {
        run.setFontFamily(FONT);
        run.setFontSize((double) pts);
        run.setBold(bold);
    }
}
