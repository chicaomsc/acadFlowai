package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.export.docx.DocumentStructureBuilder;
import br.com.dwcore.acadflow_api.export.docx.DocumentStructureBuilder.ChapterNode;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class DocumentStructureBuilderTest {

    private final DocumentStructureBuilder builder = new DocumentStructureBuilder();

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
    void shouldBuildEmptyListFromEmptyChapters() {
        assertThat(builder.build(List.of())).isEmpty();
    }

    @Test
    void shouldHandleChaptersWithoutSections() {
        Chapter c1 = chapter(ChapterType.INTRODUCTION, 1);
        Chapter c2 = chapter(ChapterType.METHODOLOGY, 2);

        List<ChapterNode> nodes = builder.build(List.of(c1, c2));

        assertThat(nodes).hasSize(2);
        assertThat(nodes.get(0).chapter()).isEqualTo(c1);
        assertThat(nodes.get(0).sections()).isEmpty();
        assertThat(nodes.get(1).chapter()).isEqualTo(c2);
    }

    @Test
    void shouldSortTopLevelChaptersByOrderIndex() {
        Chapter c3 = chapter(ChapterType.RESULTS, 3);
        Chapter c1 = chapter(ChapterType.INTRODUCTION, 1);
        Chapter c2 = chapter(ChapterType.METHODOLOGY, 2);

        List<ChapterNode> nodes = builder.build(List.of(c3, c1, c2));

        assertThat(nodes).extracting(n -> n.chapter().getOrderIndex())
                .containsExactly(1, 2, 3);
    }

    @Test
    void shouldGroupSectionsUnderParentChapter() {
        Chapter c1 = chapter(ChapterType.INTRODUCTION, 1);
        Chapter c2 = chapter(ChapterType.METHODOLOGY, 2);
        Chapter s1 = section(c1, 1);
        Chapter s2 = section(c2, 1);

        List<ChapterNode> nodes = builder.build(List.of(c1, c2, s1, s2));

        assertThat(nodes).hasSize(2);
        assertThat(nodes.get(0).sections()).containsExactly(s1);
        assertThat(nodes.get(1).sections()).containsExactly(s2);
    }

    @Test
    void shouldSortSectionsBySectionOrder() {
        Chapter c1 = chapter(ChapterType.INTRODUCTION, 1);
        Chapter sB = section(c1, 2);
        Chapter sA = section(c1, 1);
        Chapter sC = section(c1, 3);

        List<ChapterNode> nodes = builder.build(List.of(c1, sB, sA, sC));

        assertThat(nodes.get(0).sections())
                .extracting(Chapter::getSectionOrder)
                .containsExactly(1, 2, 3);
    }

    @Test
    void shouldNotIncludeOrphanSections() {
        Chapter c1 = chapter(ChapterType.INTRODUCTION, 1);
        // section with no parent (orphan — level=2 but parent=null)
        Chapter orphan = Chapter.builder().id(UUID.randomUUID())
                .title("Orphan").type(ChapterType.INTRODUCTION)
                .status(ChapterStatus.NOT_STARTED).level(2)
                .orderIndex(0).sectionOrder(1).wordCount(0).targetWordCount(0).build();

        List<ChapterNode> nodes = builder.build(List.of(c1, orphan));

        assertThat(nodes).hasSize(1);
        assertThat(nodes.get(0).sections()).isEmpty();
    }
}
