package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.project.domain.Project;
import org.apache.poi.xwpf.usermodel.XWPFDocument;

public class AbstractRenderer {

    public void render(XWPFDocument doc, Project project) {
        if (project.getAbstractPt() != null && !project.getAbstractPt().isBlank()) {
            DocxHelper.sectionHeading(doc, "Resumo");
            DocxHelper.emptyLine(doc);
            DocxHelper.bodyParagraph(doc, project.getAbstractPt());
            if (project.getKeywords() != null && !project.getKeywords().isBlank()) {
                DocxHelper.emptyLine(doc);
                DocxHelper.bodyParagraph(doc, "Palavras-chave: " + project.getKeywords());
            }
        }

        if (project.getAbstractEn() != null && !project.getAbstractEn().isBlank()) {
            DocxHelper.emptyLine(doc);
            DocxHelper.sectionHeading(doc, "Abstract");
            DocxHelper.emptyLine(doc);
            DocxHelper.bodyParagraph(doc, project.getAbstractEn());
            if (project.getKeywords() != null && !project.getKeywords().isBlank()) {
                DocxHelper.emptyLine(doc);
                DocxHelper.bodyParagraph(doc, "Keywords: " + project.getKeywords());
            }
        }
    }
}
