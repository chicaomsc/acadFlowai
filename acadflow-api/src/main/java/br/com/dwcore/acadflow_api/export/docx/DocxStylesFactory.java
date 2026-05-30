package br.com.dwcore.acadflow_api.export.docx;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFStyle;
import org.apache.poi.xwpf.usermodel.XWPFStyles;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.*;

import java.math.BigInteger;

/**
 * Registers named ABNT paragraph styles in a DOCX document.
 *
 * Named styles enable Google Docs / Word to recognize semantic structure,
 * fixing "locked" editing behaviour caused by purely inline-formatted documents.
 * Inline properties on each paragraph still override styles where needed.
 */
public final class DocxStylesFactory {

    private DocxStylesFactory() {}

    public static void register(XWPFDocument doc) {
        XWPFStyles styles = doc.getStyles() != null ? doc.getStyles() : doc.createStyles();

        // ABNTBody — 12pt TNR, justified, 1.5 spacing, 1.25 cm first-line, 0 before/after
        CTStyle body = base(DocxHelper.STYLE_BODY, "ABNT Body");
        CTPPrGeneral bodyPPr = ppr(body, STJc.BOTH, 360, 0, 0);
        bodyPPr.addNewInd().setFirstLine(BigInteger.valueOf(DocxHelper.INDENT_PARAGRAPH));
        rpr(body, DocxHelper.FONT, DocxHelper.FONT_BODY, false);
        styles.addStyle(new XWPFStyle(body));

        // ABNTHeading1 — 12pt TNR bold, left, 1.5 spacing, 24pt before, 12pt after
        CTStyle h1 = base(DocxHelper.STYLE_HEADING, "ABNT Heading 1");
        ppr(h1, STJc.LEFT, 360, DocxHelper.SPC_BEFORE_HEADING, DocxHelper.SPC_AFTER_HEADING);
        rpr(h1, DocxHelper.FONT, DocxHelper.FONT_BODY, true);
        styles.addStyle(new XWPFStyle(h1));

        // ABNTCoverTop — 12pt TNR, center, 1.5 spacing (bold set inline where needed)
        CTStyle ct = base(DocxHelper.STYLE_COVER_TOP, "ABNT Cover Top");
        ppr(ct, STJc.CENTER, 360, 0, 0);
        rpr(ct, DocxHelper.FONT, DocxHelper.FONT_BODY, false);
        styles.addStyle(new XWPFStyle(ct));

        // ABNTCoverCenter — 12pt TNR, center, 1.5 spacing
        CTStyle cc = base(DocxHelper.STYLE_COVER_CENTER, "ABNT Cover Center");
        ppr(cc, STJc.CENTER, 360, 0, 0);
        rpr(cc, DocxHelper.FONT, DocxHelper.FONT_BODY, false);
        styles.addStyle(new XWPFStyle(cc));

        // ABNTCoverBottom — 12pt TNR, center, 1.5 spacing
        CTStyle cb = base(DocxHelper.STYLE_COVER_BOTTOM, "ABNT Cover Bottom");
        ppr(cb, STJc.CENTER, 360, 0, 0);
        rpr(cb, DocxHelper.FONT, DocxHelper.FONT_BODY, false);
        styles.addStyle(new XWPFStyle(cb));

        // ABNTCaption — 10pt TNR, center, 1.0 spacing
        CTStyle cap = base(DocxHelper.STYLE_CAPTION, "ABNT Caption");
        ppr(cap, STJc.CENTER, 240, 0, 0);
        rpr(cap, DocxHelper.FONT, DocxHelper.FONT_SMALL, false);
        styles.addStyle(new XWPFStyle(cap));

        // ABNTQuoteLong — 10pt TNR, justified, 1.0 spacing, 4cm left, 12pt before/after
        CTStyle quote = base(DocxHelper.STYLE_QUOTE, "ABNT Long Quote");
        CTPPrGeneral quotePPr = ppr(quote, STJc.BOTH, 240,
                DocxHelper.SPC_AFTER_HEADING, DocxHelper.SPC_AFTER_HEADING);
        quotePPr.addNewInd().setLeft(BigInteger.valueOf(DocxHelper.INDENT_LONG_CITE));
        rpr(quote, DocxHelper.FONT, DocxHelper.FONT_SMALL, false);
        styles.addStyle(new XWPFStyle(quote));

        // ABNTReference — 12pt TNR, left, 1.0 spacing, hanging 720, 12pt after
        CTStyle ref = base(DocxHelper.STYLE_REF, "ABNT Reference");
        CTPPrGeneral refPPr = ppr(ref, STJc.LEFT, 240, 0, DocxHelper.SPC_AFTER_REF);
        var refInd = refPPr.addNewInd();
        refInd.setLeft(BigInteger.valueOf(DocxHelper.INDENT_REF_HANGING));
        refInd.setHanging(BigInteger.valueOf(DocxHelper.INDENT_REF_HANGING));
        rpr(ref, DocxHelper.FONT, DocxHelper.FONT_BODY, false);
        styles.addStyle(new XWPFStyle(ref));
    }

    private static CTStyle base(String id, String name) {
        CTStyle s = CTStyle.Factory.newInstance();
        s.setType(STStyleType.PARAGRAPH);
        s.setStyleId(id);
        s.addNewName().setVal(name);
        return s;
    }

    private static CTPPrGeneral ppr(CTStyle s, STJc.Enum jc, int line, int before, int after) {
        CTPPrGeneral pPr = s.addNewPPr();
        pPr.addNewJc().setVal(jc);
        CTSpacing sp = pPr.addNewSpacing();
        sp.setLine(BigInteger.valueOf(line));
        sp.setLineRule(STLineSpacingRule.AUTO);
        sp.setBefore(BigInteger.valueOf(before));
        sp.setAfter(BigInteger.valueOf(after));
        return pPr;
    }

    private static void rpr(CTStyle s, String font, int pts, boolean bold) {
        CTRPr rPr = s.addNewRPr();
        CTFonts fonts = rPr.addNewRFonts();
        fonts.setAscii(font);
        fonts.setHAnsi(font);
        fonts.setCs(font);
        rPr.addNewSz().setVal(BigInteger.valueOf((long) pts * 2));
        rPr.addNewSzCs().setVal(BigInteger.valueOf((long) pts * 2));
        if (bold) rPr.addNewB();
    }
}
