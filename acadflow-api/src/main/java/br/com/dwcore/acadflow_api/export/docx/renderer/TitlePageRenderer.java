package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.project.domain.Project;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;

public class TitlePageRenderer {

    public void render(XWPFDocument doc, Project project) {
        for (int i = 0; i < 2; i++) DocxHelper.emptyLine(doc);

        DocxHelper.centeredParagraph(doc, project.getUser().getName().toUpperCase(), 12, true);

        for (int i = 0; i < 4; i++) DocxHelper.emptyLine(doc);

        DocxHelper.centeredParagraph(doc, project.getTitle().toUpperCase(), 14, true);
        if (project.getSubtitle() != null && !project.getSubtitle().isBlank()) {
            DocxHelper.emptyLine(doc);
            DocxHelper.centeredParagraph(doc, project.getSubtitle(), 12, false);
        }

        for (int i = 0; i < 3; i++) DocxHelper.emptyLine(doc);

        addNatureStatement(doc, project);

        for (int i = 0; i < 4; i++) DocxHelper.emptyLine(doc);

        String cityYear = "";
        if (project.getDefenseCity() != null) cityYear += project.getDefenseCity();
        if (project.getDefenseYear() != null) {
            if (!cityYear.isBlank()) cityYear += "\n";
            cityYear += project.getDefenseYear();
        }
        if (!cityYear.isBlank()) {
            DocxHelper.centeredParagraph(doc, cityYear, 12, false);
        }
    }

    private void addNatureStatement(XWPFDocument doc, Project project) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.LEFT);
        p.setSpacingBetween(1.5, org.apache.poi.xwpf.usermodel.LineSpacingRule.AUTO);
        p.setIndentationLeft(4320); // ~7.5cm indent for nature statement

        XWPFRun run = p.createRun();
        DocxHelper.applyFont(run, 12, false);

        String degree = project.getAcademicDegree() != null ? project.getAcademicDegree().getLabel() : "conclusão de curso";
        String nature = "Trabalho apresentado ao curso de " + project.getCourse()
                + " da " + project.getInstitution()
                + " como requisito parcial para a obtenção do grau de " + degree + ".";
        run.setText(nature);

        if (project.getAdvisorName() != null && !project.getAdvisorName().isBlank()) {
            DocxHelper.emptyLine(doc);
            XWPFParagraph advisorPara = doc.createParagraph();
            advisorPara.setAlignment(ParagraphAlignment.LEFT);
            advisorPara.setSpacingBetween(1.5, org.apache.poi.xwpf.usermodel.LineSpacingRule.AUTO);
            advisorPara.setIndentationLeft(4320);
            XWPFRun advisorRun = advisorPara.createRun();
            DocxHelper.applyFont(advisorRun, 12, false);
            advisorRun.setText("Orientador(a): " + project.getAdvisorName());
        }
    }
}
