package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.export.docx.renderer.SummaryRenderer;
import br.com.dwcore.acadflow_api.export.template.AcademicTemplateRegistry;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class SummaryRendererTest {

    private final SummaryRenderer renderer = new SummaryRenderer();

    private Chapter chapter(ChapterType type, String title, int orderIndex) {
        return Chapter.builder()
                .id(UUID.randomUUID())
                .title(title)
                .type(type)
                .status(ChapterStatus.NOT_STARTED)
                .orderIndex(orderIndex)
                .wordCount(0).targetWordCount(2000)
                .build();
    }

    private Chapter section(Chapter parent, String title, int sectionOrder) {
        return Chapter.builder()
                .id(UUID.randomUUID())
                .title(title)
                .type(parent.getType())
                .status(ChapterStatus.NOT_STARTED)
                .orderIndex(0)
                .sectionOrder(sectionOrder)
                .level(2)
                .parent(parent)
                .wordCount(0).targetWordCount(2000)
                .build();
    }

    private String allText(XWPFDocument doc) {
        return doc.getParagraphs().stream()
                .map(DocxHelper::paragraphAllText)
                .collect(Collectors.joining(" "));
    }

    @Test
    void shouldRenderChapterWithoutSections() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(intro));

        String text = allText(doc);
        assertThat(text).contains("SUMÁRIO");
        assertThat(text).contains("1  INTRODUÇÃO");
    }

    @Test
    void shouldRenderChapterWithSections() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter s1 = section(intro, "Contextualização", 1);
        Chapter s2 = section(intro, "Problema de Pesquisa", 2);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(intro, s1, s2));

        String text = allText(doc);
        assertThat(text).contains("1  INTRODUÇÃO");
        assertThat(text).contains("1.1  Contextualização");
        assertThat(text).contains("1.2  Problema de Pesquisa");
    }

    @Test
    void shouldRenderMultipleChaptersWithSections() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter sA1 = section(intro, "Contextualização", 1);
        Chapter sA2 = section(intro, "Objetivos", 2);

        Chapter method = chapter(ChapterType.METHODOLOGY, "Metodologia", 2);
        Chapter sB1 = section(method, "Tipo de Pesquisa", 1);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(intro, method, sA1, sA2, sB1));

        String text = allText(doc);
        assertThat(text).contains("1  INTRODUÇÃO");
        assertThat(text).contains("1.1  Contextualização");
        assertThat(text).contains("1.2  Objetivos");
        assertThat(text).contains("2  METODOLOGIA");
        assertThat(text).contains("2.1  Tipo de Pesquisa");
    }

    @Test
    void shouldOrderSectionsCorrectly() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter sC = section(intro, "Terceira seção", 3);
        Chapter sA = section(intro, "Primeira seção", 1);
        Chapter sB = section(intro, "Segunda seção", 2);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(intro, sC, sA, sB));

        List<String> sectionEntries = doc.getParagraphs().stream()
                .map(DocxHelper::paragraphAllText)
                .filter(t -> t.contains("seção"))
                .collect(Collectors.toList());

        assertThat(sectionEntries).containsExactly(
                "1.1  Primeira seção",
                "1.2  Segunda seção",
                "1.3  Terceira seção"
        );
    }

    @Test
    void shouldNotNumberReferencesChapter() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter refs = chapter(ChapterType.REFERENCES, "Referências", 2);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(intro, refs));

        String text = allText(doc);
        assertThat(text).contains("1  INTRODUÇÃO");
        assertThat(text).contains("REFERÊNCIAS");
        assertThat(text).doesNotContain("2  REFERÊNCIAS");
    }

    @Test
    void shouldWorkWithFemafTemplate() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter s1 = section(intro, "Contexto", 1);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(intro, s1), AcademicTemplateRegistry.FEMAF);

        String text = allText(doc);
        assertThat(text).contains("SUMÁRIO");
        assertThat(text).contains("1  INTRODUÇÃO");
        assertThat(text).contains("1.1  Contexto");
    }

    @Test
    void shouldWorkWithAbntGenericTemplate() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter s1 = section(intro, "Contexto", 1);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(intro, s1), AcademicTemplateRegistry.ABNT_GENERIC);

        String text = allText(doc);
        assertThat(text).contains("SUMÁRIO");
        assertThat(text).contains("1.1  Contexto");
    }

    @Test
    void shouldNotRenderSectionsUnderReferencesChapter() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter refs = chapter(ChapterType.REFERENCES, "Referências", 2);
        Chapter orphan = section(refs, "Obras Citadas", 1);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(intro, refs, orphan));

        String text = allText(doc);
        assertThat(text).contains("REFERÊNCIAS");
        assertThat(text).doesNotContain("Obras Citadas");
    }

    @Test
    void sectionEntryShouldHaveVisualIndent() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);
        Chapter s1 = section(intro, "Seção indentada", 1);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(intro, s1));

        XWPFParagraph sectionPara = doc.getParagraphs().stream()
                .filter(p -> DocxHelper.paragraphAllText(p).equals("1.1  Seção indentada"))
                .findFirst().orElseThrow();

        assertThat(sectionPara.getIndentationLeft())
                .as("section entry must have left indent")
                .isGreaterThan(0);
    }

    @Test
    void chapterEntryShouldHaveNoIndent() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, "Introdução", 1);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(intro));

        XWPFParagraph chapterPara = doc.getParagraphs().stream()
                .filter(p -> DocxHelper.paragraphAllText(p).equals("1  INTRODUÇÃO"))
                .findFirst().orElseThrow();

        assertThat(chapterPara.getIndentationLeft())
                .as("chapter entry must not have left indent")
                .isLessThanOrEqualTo(0);
    }
}
