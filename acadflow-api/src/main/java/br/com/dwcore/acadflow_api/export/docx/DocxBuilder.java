package br.com.dwcore.acadflow_api.export.docx;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.export.docx.renderer.*;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.reference.domain.Reference;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Component
public class DocxBuilder {

    private final CoverRenderer coverRenderer = new CoverRenderer();
    private final TitlePageRenderer titlePageRenderer = new TitlePageRenderer();
    private final AbstractRenderer abstractRenderer = new AbstractRenderer();
    private final SummaryRenderer summaryRenderer = new SummaryRenderer();
    private final ChapterRenderer chapterRenderer = new ChapterRenderer();
    private final ReferenceRenderer referenceRenderer = new ReferenceRenderer();

    public byte[] build(Project project, List<Chapter> chapters, List<Reference> references) throws IOException {
        try (XWPFDocument doc = new XWPFDocument()) {
            DocxHelper.setupPageMargins(doc);

            coverRenderer.render(doc, project);
            DocxHelper.pageBreak(doc);

            titlePageRenderer.render(doc, project);
            DocxHelper.pageBreak(doc);

            abstractRenderer.render(doc, project);
            DocxHelper.pageBreak(doc);

            summaryRenderer.render(doc, chapters);

            chapterRenderer.render(doc, chapters);

            if (!references.isEmpty()) {
                DocxHelper.pageBreak(doc);
                referenceRenderer.render(doc, references);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.write(out);
            return out.toByteArray();
        }
    }
}
