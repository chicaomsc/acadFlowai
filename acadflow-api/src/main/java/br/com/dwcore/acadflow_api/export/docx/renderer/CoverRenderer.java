package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplate;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateRegistry;
import br.com.dwcore.acadflow_api.project.domain.Project;
import org.apache.poi.xwpf.usermodel.*;

public class CoverRenderer {

    public void render(XWPFDocument doc, Project project) {
        render(doc, project, AcademicTemplateRegistry.ABNT_GENERIC);
    }

    public void render(XWPFDocument doc, Project project, AcademicTemplate template) {
        // template accepted for future profile-specific cover variations;
        // base structure (institution, author, title, city/year) is common across all profiles.

        // ── Institution / course — top area ──────────────────────────────────
        para(doc, project.getInstitution(), DocxHelper.FONT_BODY, true,
                DocxHelper.SPC_COVER_TOP, DocxHelper.STYLE_COVER_TOP);
        if (project.getCourse() != null && !project.getCourse().isBlank()) {
            para(doc, "Curso de " + project.getCourse(), DocxHelper.FONT_BODY, false,
                    DocxHelper.SPC_COVER_NEARBY, DocxHelper.STYLE_COVER_TOP);
        }

        // ── Author — upper-centre ─────────────────────────────────────────────
        para(doc, project.getUser().getName().toUpperCase(), DocxHelper.FONT_BODY, true,
                DocxHelper.SPC_COVER_GAP, DocxHelper.STYLE_COVER_CENTER);

        // ── Title — centre ────────────────────────────────────────────────────
        para(doc, project.getTitle().toUpperCase(), DocxHelper.FONT_BODY, true,
                DocxHelper.SPC_COVER_GAP, DocxHelper.STYLE_COVER_CENTER);
        if (project.getSubtitle() != null && !project.getSubtitle().isBlank()) {
            para(doc, project.getSubtitle(), DocxHelper.FONT_BODY, false,
                    DocxHelper.SPC_COVER_NEARBY, DocxHelper.STYLE_COVER_CENTER);
        }

        // ── City / Year — lower area ──────────────────────────────────────────
        if (project.getDefenseCity() != null && !project.getDefenseCity().isBlank()) {
            para(doc, project.getDefenseCity(), DocxHelper.FONT_BODY, false,
                    DocxHelper.SPC_COVER_CITY_GAP, DocxHelper.STYLE_COVER_BOTTOM);
        }
        if (project.getDefenseYear() != null) {
            para(doc, String.valueOf(project.getDefenseYear()), DocxHelper.FONT_BODY, false,
                    DocxHelper.SPC_COVER_NEARBY, DocxHelper.STYLE_COVER_BOTTOM);
        }
    }

    private XWPFParagraph para(XWPFDocument doc, String text, int pts, boolean bold,
                                int spacingBefore, String style) {
        XWPFParagraph p = doc.createParagraph();
        p.setStyle(style);
        p.setAlignment(ParagraphAlignment.CENTER);
        p.setSpacingBetween(DocxHelper.SPACING_BODY, LineSpacingRule.AUTO);
        p.setSpacingBefore(spacingBefore);
        p.setSpacingAfter(0);
        XWPFRun run = p.createRun();
        DocxHelper.applyFont(run, pts, bold);
        run.setText(text != null ? text : "");
        return p;
    }
}
