package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplate;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateRegistry;
import br.com.dwcore.acadflow_api.project.domain.Project;
import org.apache.poi.xwpf.usermodel.XWPFDocument;

public class AbstractRenderer {

    public void render(XWPFDocument doc, Project project) {
        render(doc, project, AcademicTemplateRegistry.ABNT_GENERIC);
    }

    public void render(XWPFDocument doc, Project project, AcademicTemplate template) {
        if (project.getAbstractPt() != null && !project.getAbstractPt().isBlank()) {
            DocxHelper.sectionHeading(doc, template.resumoLabel());
            DocxHelper.bodyParagraph(doc, project.getAbstractPt());
            if (project.getKeywords() != null && !project.getKeywords().isBlank()) {
                DocxHelper.bodyParagraph(doc, "Palavras-chave: " + project.getKeywords());
            }
        }

        if (project.getAbstractEn() != null && !project.getAbstractEn().isBlank()) {
            DocxHelper.sectionHeading(doc, template.abstractLabel());
            DocxHelper.bodyParagraph(doc, project.getAbstractEn());
            if (project.getKeywords() != null && !project.getKeywords().isBlank()) {
                DocxHelper.bodyParagraph(doc, "Keywords: " + project.getKeywords());
            }
        }
    }
}
