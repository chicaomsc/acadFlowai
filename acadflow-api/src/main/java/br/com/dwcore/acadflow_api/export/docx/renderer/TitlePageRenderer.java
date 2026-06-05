package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplate;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateRegistry;
import br.com.dwcore.acadflow_api.project.domain.Project;
import org.apache.poi.xwpf.usermodel.*;

public class TitlePageRenderer {

    public void render(XWPFDocument doc, Project project) {
        render(doc, project, AcademicTemplateRegistry.ABNT_GENERIC);
    }

    public void render(XWPFDocument doc, Project project, AcademicTemplate template) {
        // Author
        centeredPara(doc, project.getUser().getName().toUpperCase(),
                DocxHelper.FONT_BODY, true, 1134, DocxHelper.STYLE_COVER_CENTER);

        // Title
        centeredPara(doc, project.getTitle().toUpperCase(),
                DocxHelper.FONT_BODY, true, 2268, DocxHelper.STYLE_COVER_CENTER);
        if (project.getSubtitle() != null && !project.getSubtitle().isBlank()) {
            centeredPara(doc, project.getSubtitle(), DocxHelper.FONT_BODY, false, 240,
                    DocxHelper.STYLE_COVER_CENTER);
        }

        // Nature statement + advisor (uses template-specific pattern)
        addNatureStatement(doc, project, template);

        // City / Year
        if (project.getDefenseCity() != null && !project.getDefenseCity().isBlank()) {
            centeredPara(doc, project.getDefenseCity(), DocxHelper.FONT_BODY, false, 2835,
                    DocxHelper.STYLE_COVER_BOTTOM);
        }
        if (project.getDefenseYear() != null) {
            centeredPara(doc, String.valueOf(project.getDefenseYear()), DocxHelper.FONT_BODY, false, 240,
                    DocxHelper.STYLE_COVER_BOTTOM);
        }
    }

    private void addNatureStatement(XWPFDocument doc, Project project, AcademicTemplate template) {
        XWPFParagraph p = doc.createParagraph();
        p.setStyle(DocxHelper.STYLE_BODY);
        p.setAlignment(ParagraphAlignment.BOTH);
        p.setSpacingBetween(DocxHelper.SPACING_BODY, LineSpacingRule.AUTO);
        p.setSpacingBefore(1701);
        p.setSpacingAfter(0);
        p.setIndentationLeft(DocxHelper.INDENT_NATURE_STMT);
        XWPFRun run = p.createRun();
        DocxHelper.applyFont(run, DocxHelper.FONT_BODY, false);
        String degree = project.getAcademicDegree() != null
                ? project.getAcademicDegree().getLabel() : "conclusão de curso";
        run.setText(template.buildNatureStatement(project.getCourse(), project.getInstitution(), degree));

        if (project.getAdvisorName() != null && !project.getAdvisorName().isBlank()) {
            XWPFParagraph ap = doc.createParagraph();
            ap.setStyle(DocxHelper.STYLE_BODY);
            ap.setAlignment(ParagraphAlignment.BOTH);
            ap.setSpacingBetween(DocxHelper.SPACING_BODY, LineSpacingRule.AUTO);
            ap.setSpacingBefore(DocxHelper.SPC_AFTER_HEADING);
            ap.setSpacingAfter(0);
            ap.setIndentationLeft(DocxHelper.INDENT_NATURE_STMT);
            XWPFRun ar = ap.createRun();
            DocxHelper.applyFont(ar, DocxHelper.FONT_BODY, false);
            ar.setText("Orientador(a): " + project.getAdvisorName());
        }
    }

    private XWPFParagraph centeredPara(XWPFDocument doc, String text, int pts, boolean bold,
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
