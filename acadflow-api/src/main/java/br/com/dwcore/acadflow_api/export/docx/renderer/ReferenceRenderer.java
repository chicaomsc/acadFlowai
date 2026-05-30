package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplate;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateRegistry;
import br.com.dwcore.acadflow_api.reference.domain.Reference;
import org.apache.poi.xwpf.usermodel.*;

import java.util.Comparator;
import java.util.List;

public class ReferenceRenderer {

    public void render(XWPFDocument doc, List<Reference> references) {
        render(doc, references, AcademicTemplateRegistry.ABNT_GENERIC);
    }

    public void render(XWPFDocument doc, List<Reference> references, AcademicTemplate template) {
        DocxHelper.sectionHeading(doc, template.referencesLabel());

        references.stream()
                .sorted(Comparator.comparing(
                        r -> r.getAuthors() != null ? r.getAuthors() : "",
                        String.CASE_INSENSITIVE_ORDER))
                .forEach(ref -> addReference(doc, ref));
    }

    private void addReference(XWPFDocument doc, Reference ref) {
        String formatted = ref.getAbntFormatted() != null && !ref.getAbntFormatted().isBlank()
                ? ref.getAbntFormatted()
                : fallbackFormat(ref);

        XWPFParagraph p = doc.createParagraph();
        p.setStyle(DocxHelper.STYLE_REF);
        p.setAlignment(ParagraphAlignment.LEFT);
        p.setSpacingBetween(DocxHelper.SPACING_SINGLE, LineSpacingRule.AUTO);
        p.setSpacingBefore(0);
        p.setSpacingAfter(DocxHelper.SPC_AFTER_REF);
        p.setIndentationLeft(DocxHelper.INDENT_REF_HANGING);
        p.setIndentationHanging(DocxHelper.INDENT_REF_HANGING);
        XWPFRun run = p.createRun();
        DocxHelper.applyFont(run, DocxHelper.FONT_BODY, false);
        run.setText(formatted);
    }

    private String fallbackFormat(Reference ref) {
        String authors = ref.getAuthors() != null && !ref.getAuthors().isBlank()
                ? ref.getAuthors() : "AUTOR NÃO INFORMADO";
        String title = ref.getTitle() != null && !ref.getTitle().isBlank()
                ? ref.getTitle() : "TÍTULO NÃO INFORMADO";
        String year = ref.getYear() != null ? String.valueOf(ref.getYear()) : "s.d.";
        return authors + ". " + title + ". " + year + ".";
    }
}
