package br.com.dwcore.acadflow_api.export.docx;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTable;
import br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType;
import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.export.docx.dto.LoadedFigure;
import br.com.dwcore.acadflow_api.export.docx.dto.NumberedFigure;
import br.com.dwcore.acadflow_api.export.docx.dto.NumberedTable;
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
    private final TableListRenderer tableListRenderer = new TableListRenderer();

    private static final Pattern TABLE_QUADRO_PATTERN = Pattern.compile(
            "\\[\\[@(TABLE|QUADRO):([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\]\\]"
    );

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
        return build(project, chapters, references, Map.of(), Map.of(), Map.of());
    }

    // backward-compat: citations only
    public byte[] build(Project project, List<Chapter> chapters, List<Reference> references,
                        Map<UUID, Citation> citationLookup) throws IOException {
        return build(project, chapters, references, citationLookup, Map.of(), Map.of());
    }

    // backward-compat: citations + figures
    public byte[] build(Project project, List<Chapter> chapters, List<Reference> references,
                        Map<UUID, Citation> citationLookup,
                        Map<UUID, LoadedFigure> figureLookup) throws IOException {
        return build(project, chapters, references, citationLookup, figureLookup, Map.of());
    }

    // full: citations + figures + tables
    public byte[] build(Project project, List<Chapter> chapters, List<Reference> references,
                        Map<UUID, Citation> citationLookup,
                        Map<UUID, LoadedFigure> figureLookup,
                        Map<UUID, AcademicTable> tableLookup) throws IOException {

        AcademicTemplate template = templateResolver.resolve(project);

        List<NumberedFigure> orderedFigures = computeOrderedFigures(chapters, figureLookup);
        Map<UUID, NumberedFigure> numberedFigureLookup = new HashMap<>();
        for (NumberedFigure nf : orderedFigures) {
            numberedFigureLookup.put(nf.figure().getId(), nf);
        }

        List<NumberedTable> orderedTables = computeOrderedTables(chapters, tableLookup);
        Map<UUID, NumberedTable> numberedTableLookup = new HashMap<>();
        for (NumberedTable nt : orderedTables) {
            numberedTableLookup.put(nt.table().getId(), nt);
        }

        Map<UUID, String> xrefLookup = computeCrossRefLookup(orderedFigures, orderedTables);

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

            if (tableListRenderer.renderTableList(doc, orderedTables, template)) {
                DocxHelper.pageBreak(doc);
            }

            if (tableListRenderer.renderQuadroList(doc, orderedTables, template)) {
                DocxHelper.pageBreak(doc);
            }

            summaryRenderer.render(doc, chapters, template);

            chapterRenderer.render(doc, chapters, citationLookup, numberedFigureLookup,
                    numberedTableLookup, template, xrefLookup);

            if (!references.isEmpty()) {
                DocxHelper.pageBreak(doc);
                referenceRenderer.render(doc, references, template);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.write(out);
            return out.toByteArray();
        }
    }

    private Map<UUID, String> computeCrossRefLookup(List<NumberedFigure> orderedFigures,
                                                     List<NumberedTable> orderedTables) {
        Map<UUID, String> lookup = new LinkedHashMap<>();
        for (NumberedFigure nf : orderedFigures) {
            lookup.put(nf.figure().getId(), "Figura " + nf.number());
        }
        for (NumberedTable nt : orderedTables) {
            String label = nt.table().getType() == AcademicTableType.TABLE ? "Tabela " : "Quadro ";
            lookup.put(nt.table().getId(), label + nt.number());
        }
        return lookup;
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

    private List<NumberedTable> computeOrderedTables(List<Chapter> chapters,
                                                      Map<UUID, AcademicTable> tableLookup) {
        if (tableLookup.isEmpty()) return List.of();

        List<NumberedTable> result = new ArrayList<>();
        Set<UUID> seen = new HashSet<>();
        int tableCounter = 1;
        int quadroCounter = 1;

        for (Chapter chapter : chapters) {
            String content = chapter.getContent();
            if (content == null || content.isBlank()) continue;
            Matcher m = TABLE_QUADRO_PATTERN.matcher(content);
            while (m.find()) {
                UUID id = UUID.fromString(m.group(2));
                AcademicTable table = tableLookup.get(id);
                if (table != null && seen.add(id)) {
                    int num = switch (table.getType()) {
                        case TABLE  -> tableCounter++;
                        case QUADRO -> quadroCounter++;
                    };
                    result.add(new NumberedTable(table, num));
                }
            }
        }
        return result;
    }
}
