package br.com.dwcore.acadflow_api.export.docx;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

public class DocumentStructureBuilder {

    public record ChapterNode(Chapter chapter, List<Chapter> sections) {}

    public List<ChapterNode> build(List<Chapter> chapters) {
        List<Chapter> topLevel = chapters.stream()
                .filter(c -> c.getLevel() == null || c.getLevel() <= 1)
                .sorted(Comparator.comparingInt(Chapter::getOrderIndex))
                .toList();

        Map<UUID, List<Chapter>> sectionsByParent = chapters.stream()
                .filter(c -> c.getLevel() != null && c.getLevel() == 2 && c.getParent() != null)
                .collect(Collectors.groupingBy(
                        c -> c.getParent().getId(),
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> list.stream()
                                        .sorted(Comparator.comparingInt(
                                                s -> s.getSectionOrder() != null ? s.getSectionOrder() : 0))
                                        .collect(Collectors.toList()))));

        return topLevel.stream()
                .map(ch -> new ChapterNode(ch, sectionsByParent.getOrDefault(ch.getId(), List.of())))
                .toList();
    }
}
