package br.com.dwcore.acadflow_api.export.docx;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.export.docx.dto.LoadedFigure;
import br.com.dwcore.acadflow_api.export.docx.dto.NumberedFigure;
import br.com.dwcore.acadflow_api.export.docx.renderer.*;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplate;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateResolver;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.reference.domain.Reference;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class DocxBuilder {

    private static final Pattern FIG_PATTERN = Pattern.compile(
            "\\[\\[@FIG:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\]\\]"
    );

    private final AcademicTemplateResolver templateResolver;

    private final CoverRenderer coverRenderer = new CoverRenderer();
    private final TitlePageRenderer titlePageRenderer = new TitlePageRenderer();
    private final AbstractRenderer abstractRenderer = new AbstractRenderer();
    private final SummaryRenderer summaryRenderer = new SummaryRenderer();
    private final ChapterRenderer chapterRenderer = new ChapterRenderer();
    private final ReferenceRenderer referenceRenderer = new ReferenceRenderer();
    private final FigureListRenderer figureListRenderer = new FigureListRenderer();

    @Autowired
    public DocxBuilder(AcademicTemplateResolver templateResolver) {
        this.templateResolver = templateResolver;
    }

    /** No-arg constructor for use in unit tests (resolves to ABNT_GENERIC by default). */
    public DocxBuilder() {
        this(new AcademicTemplateResolver());
    }

    // backward-compat: no citations, no figures
    public byte[] build(Project project, List<Chapter> chapters, List<Reference> references) throws IOException {
        return build(project, chapters, references, Map.of(), Map.of());
    }

    // backward-compat: citations only
    public byte[] build(Project project, List<Chapter> chapters, List<Reference> references,
                        Map<UUID, Citation> citationLookup) throws IOException {
        return build(project, chapters, references, citationLookup, Map.of());
    }

    // full: citations + figures
    public byte[] build(Project project, List<Chapter> chapters, List<Reference> references,
                        Map<UUID, Citation> citationLookup,
                        Map<UUID, LoadedFigure> figureLookup) throws IOException {

        AcademicTemplate template = templateResolver.resolve(project);

        List<NumberedFigure> orderedFigures = computeOrderedFigures(chapters, figureLookup);
        Map<UUID, NumberedFigure> numberedFigureLookup = new HashMap<>();
        for (NumberedFigure nf : orderedFigures) {
            numberedFigureLookup.put(nf.figure().getId(), nf);
        }

        try (XWPFDocument doc = new XWPFDocument()) {
            DocxStylesFactory.register(doc);
            DocxHelper.setupPageMargins(doc);

            coverRenderer.render(doc, project, template);
            DocxHelper.pageBreak(doc);

            titlePageRenderer.render(doc, project, template);
            DocxHelper.pageBreak(doc);

            abstractRenderer.render(doc, project, template);
            DocxHelper.pageBreak(doc);

            figureListRenderer.render(doc, orderedFigures, template);
            if (!orderedFigures.isEmpty()) {
                DocxHelper.pageBreak(doc);
            }

            summaryRenderer.render(doc, chapters, template);

            chapterRenderer.render(doc, chapters, citationLookup, numberedFigureLookup, template);

            if (!references.isEmpty()) {
                DocxHelper.pageBreak(doc);
                referenceRenderer.render(doc, references, template);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.write(out);
            return out.toByteArray();
        }
    }

    private List<NumberedFigure> computeOrderedFigures(List<Chapter> chapters,
                                                        Map<UUID, LoadedFigure> figureLookup) {
        if (figureLookup.isEmpty()) return List.of();

        List<NumberedFigure> result = new ArrayList<>();
        int counter = 1;
        for (Chapter chapter : chapters) {
            String content = chapter.getContent();
            if (content == null || content.isBlank()) continue;
            Matcher m = FIG_PATTERN.matcher(content);
            while (m.find()) {
                UUID id = UUID.fromString(m.group(1));
                LoadedFigure lf = figureLookup.get(id);
                if (lf != null) {
                    result.add(new NumberedFigure(lf.figure(), lf.imageData(), counter++));
                }
            }
        }
        return result;
    }
}
