package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.export.docx.AcademicNumberingService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AcademicNumberingServiceTest {

    private final AcademicNumberingService service = new AcademicNumberingService();

    private Chapter chapter(ChapterType type, int orderIndex) {
        return Chapter.builder().id(UUID.randomUUID())
                .title("T").type(type).status(ChapterStatus.WRITING)
                .orderIndex(orderIndex).wordCount(0).targetWordCount(0).build();
    }

    private Chapter section(Chapter parent, int sectionOrder) {
        return Chapter.builder().id(UUID.randomUUID())
                .parent(parent).title("S").type(parent.getType())
                .status(ChapterStatus.NOT_STARTED).level(2)
                .orderIndex(0).sectionOrder(sectionOrder)
                .wordCount(0).targetWordCount(0).build();
    }

    @Test
    void shouldNumberChaptersSequentially() {
        Chapter c1 = chapter(ChapterType.INTRODUCTION, 1);
        Chapter c2 = chapter(ChapterType.METHODOLOGY, 2);
        Chapter c3 = chapter(ChapterType.RESULTS, 3);

        Map<UUID, Integer> numbers = service.computeChapterNumbers(List.of(c1, c2, c3));

        assertThat(numbers).containsEntry(c1.getId(), 1)
                .containsEntry(c2.getId(), 2)
                .containsEntry(c3.getId(), 3);
    }

    @Test
    void shouldSkipReferencesInChapterNumbers() {
        Chapter intro = chapter(ChapterType.INTRODUCTION, 1);
        Chapter refs  = chapter(ChapterType.REFERENCES, 2);
        Chapter conc  = chapter(ChapterType.CONCLUSION, 3);

        Map<UUID, Integer> numbers = service.computeChapterNumbers(List.of(intro, refs, conc));

        assertThat(numbers).containsEntry(intro.getId(), 1)
                .doesNotContainKey(refs.getId())
                .containsEntry(conc.getId(), 2);
    }

    @Test
    void shouldHandleReferencesInMiddleOfList() {
        Chapter c1   = chapter(ChapterType.INTRODUCTION, 1);
        Chapter refs = chapter(ChapterType.REFERENCES, 2);
        Chapter c2   = chapter(ChapterType.METHODOLOGY, 3);
        Chapter c3   = chapter(ChapterType.CONCLUSION, 4);

        Map<UUID, Integer> numbers = service.computeChapterNumbers(List.of(c1, refs, c2, c3));

        assertThat(numbers).containsEntry(c1.getId(), 1)
                .containsEntry(c2.getId(), 2)
                .containsEntry(c3.getId(), 3)
                .doesNotContainKey(refs.getId());
    }

    @Test
    void shouldComputeSectionNumbers() {
        Chapter c1 = chapter(ChapterType.INTRODUCTION, 1);
        Chapter c2 = chapter(ChapterType.METHODOLOGY, 2);
        Chapter s1 = section(c1, 1);
        Chapter s2 = section(c1, 2);
        Chapter s3 = section(c2, 1);

        Map<UUID, Integer> chapterNumbers = service.computeChapterNumbers(List.of(c1, c2));
        Map<UUID, String> sectionNumbers = service.computeSectionNumbers(
                List.of(c1, c2, s1, s2, s3), chapterNumbers);

        assertThat(sectionNumbers).containsEntry(s1.getId(), "1.1")
                .containsEntry(s2.getId(), "1.2")
                .containsEntry(s3.getId(), "2.1");
    }

    @Test
    void shouldComputeXrefLabels() {
        Chapter c1 = chapter(ChapterType.INTRODUCTION, 1);
        Chapter c2 = chapter(ChapterType.METHODOLOGY, 2);
        Chapter s1 = section(c1, 1);

        Map<UUID, String> labels = service.computeXrefLabels(List.of(c1, c2, s1));

        assertThat(labels).containsEntry(c1.getId(), "Capítulo 1")
                .containsEntry(c2.getId(), "Capítulo 2")
                .containsEntry(s1.getId(), "Seção 1.1");
    }

    @Test
    void shouldHandleEmptyList() {
        assertThat(service.computeChapterNumbers(List.of())).isEmpty();
        assertThat(service.computeSectionNumbers(List.of(), Map.of())).isEmpty();
        assertThat(service.computeXrefLabels(List.of())).isEmpty();
    }
}
