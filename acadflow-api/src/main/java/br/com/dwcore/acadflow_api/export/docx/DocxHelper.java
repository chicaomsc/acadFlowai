package br.com.dwcore.acadflow_api.export.docx;

import org.apache.poi.xwpf.usermodel.*;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.*;

import java.math.BigInteger;

public final class DocxHelper {

    public static final String FONT = "Times New Roman";

    private DocxHelper() {}

    public static XWPFParagraph centeredParagraph(XWPFDocument doc, String text, int pts, boolean bold) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        p.setSpacingBetween(1.5, LineSpacingRule.AUTO);
        XWPFRun run = p.createRun();
        applyFont(run, pts, bold);
        run.setText(text != null ? text : "");
        return p;
    }

    public static XWPFParagraph bodyParagraph(XWPFDocument doc, String text) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.BOTH);
        p.setSpacingBetween(1.5, LineSpacingRule.AUTO);
        p.setIndentationFirstLine(709); // 1.25 cm in twips
        XWPFRun run = p.createRun();
        applyFont(run, 12, false);
        run.setText(text != null ? text : "");
        return p;
    }

    public static XWPFParagraph sectionHeading(XWPFDocument doc, String text) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.LEFT);
        p.setSpacingBetween(1.5, LineSpacingRule.AUTO);
        p.setSpacingBefore(480);
        p.setSpacingAfter(240);
        XWPFRun run = p.createRun();
        applyFont(run, 12, true);
        run.setText(text != null ? text.toUpperCase() : "");
        return p;
    }

    public static XWPFParagraph emptyLine(XWPFDocument doc) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun run = p.createRun();
        applyFont(run, 12, false);
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
        CTPageMar pgMar = sectPr.isSetPgMar() ? sectPr.getPgMar() : sectPr.addNewPgMar();
        // ABNT NBR 14724: top=3cm, left=3cm, bottom=2cm, right=2cm (1 cm ≈ 567 twips)
        pgMar.setTop(BigInteger.valueOf(1701));
        pgMar.setLeft(BigInteger.valueOf(1701));
        pgMar.setBottom(BigInteger.valueOf(1134));
        pgMar.setRight(BigInteger.valueOf(1134));
    }

    public static void applyFont(XWPFRun run, int pts, boolean bold) {
        run.setFontFamily(FONT);
        run.setFontSize(pts * 2); // setFontSize is in half-points: 24 = 12pt
        run.setBold(bold);
    }
}
