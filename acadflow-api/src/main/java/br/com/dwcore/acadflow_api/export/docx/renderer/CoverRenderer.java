package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.project.domain.Project;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;

public class CoverRenderer {

    public void render(XWPFDocument doc, Project project) {
        for (int i = 0; i < 4; i++) DocxHelper.emptyLine(doc);

        DocxHelper.centeredParagraph(doc, project.getInstitution(), 12, true);
        DocxHelper.emptyLine(doc);
        if (project.getCourse() != null) {
            DocxHelper.centeredParagraph(doc, "Curso de " + project.getCourse(), 12, false);
        }

        for (int i = 0; i < 6; i++) DocxHelper.emptyLine(doc);

        DocxHelper.centeredParagraph(doc, project.getUser().getName().toUpperCase(), 12, true);

        for (int i = 0; i < 6; i++) DocxHelper.emptyLine(doc);

        DocxHelper.centeredParagraph(doc, project.getTitle().toUpperCase(), 14, true);
        if (project.getSubtitle() != null && !project.getSubtitle().isBlank()) {
            DocxHelper.emptyLine(doc);
            DocxHelper.centeredParagraph(doc, project.getSubtitle(), 12, false);
        }

        for (int i = 0; i < 8; i++) DocxHelper.emptyLine(doc);

        String cityYear = buildCityYear(project);
        DocxHelper.centeredParagraph(doc, cityYear, 12, false);
    }

    private String buildCityYear(Project project) {
        String city = project.getDefenseCity() != null ? project.getDefenseCity() : "";
        String year = project.getDefenseYear() != null ? String.valueOf(project.getDefenseYear()) : "";
        if (!city.isBlank() && !year.isBlank()) return city + "\n" + year;
        if (!city.isBlank()) return city;
        if (!year.isBlank()) return year;
        return "";
    }
}
