package br.com.dwcore.acadflow_api.export.docx.renderer;

import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.reference.domain.Reference;
import org.apache.poi.xwpf.usermodel.*;

import java.util.Comparator;
import java.util.List;

public class ReferenceRenderer {

    public void render(XWPFDocument doc, List<Reference> references) {
        DocxHelper.sectionHeading(doc, "Referências");
        DocxHelper.emptyLine(doc);

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
        p.setAlignment(ParagraphAlignment.BOTH);
        p.setSpacingBetween(1.0, LineSpacingRule.AUTO);
        p.setSpacingAfter(240);
        p.setIndentationLeft(720);
        p.setIndentationHanging(720); // hanging indent for ABNT

        XWPFRun run = p.createRun();
        DocxHelper.applyFont(run, 12, false);
        run.setText(formatted);
    }

    private String fallbackFormat(Reference ref) {
        String authors = ref.getAuthors() != null && !ref.getAuthors().isBlank()
                ? ref.getAuthors() : "AUTOR NÃO INFORMADO";
        String title = ref.getTitle() != null && !ref.getTitle().isBlank()
                ? ref.getTitle() : "TÍTULO NÃO INFORMADO";
        String year = ref.getYear() != null
                ? String.valueOf(ref.getYear()) : "s.d.";
        return authors + ". " + title + ". " + year + ".";
    }
}
