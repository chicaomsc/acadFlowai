package br.com.dwcore.acadflow_api.export.docx;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class AcademicNumberingService {

    public Map<UUID, Integer> computeChapterNumbers(List<Chapter> chapters) {
        Map<UUID, Integer> result = new LinkedHashMap<>();
        int number = 1;
        for (Chapter chapter : chapters) {
            if ((chapter.getLevel() == null || chapter.getLevel() <= 1)
                    && chapter.getType() != ChapterType.REFERENCES) {
                result.put(chapter.getId(), number++);
            }
        }
        return result;
    }

    public Map<UUID, String> computeSectionNumbers(List<Chapter> chapters,
                                                    Map<UUID, Integer> chapterNumbers) {
        Map<UUID, String> result = new LinkedHashMap<>();
        for (Chapter chapter : chapters) {
            if (chapter.getLevel() != null && chapter.getLevel() == 2
                    && chapter.getParent() != null) {
                Integer parentNumber = chapterNumbers.get(chapter.getParent().getId());
                if (parentNumber != null) {
                    int sOrder = chapter.getSectionOrder() != null ? chapter.getSectionOrder() : 0;
                    result.put(chapter.getId(), parentNumber + "." + sOrder);
                }
            }
        }
        return result;
    }

    public Map<UUID, String> computeXrefLabels(List<Chapter> chapters) {
        Map<UUID, String> result = new LinkedHashMap<>();
        Map<UUID, Integer> chapterNumbers = computeChapterNumbers(chapters);
        for (Map.Entry<UUID, Integer> entry : chapterNumbers.entrySet()) {
            result.put(entry.getKey(), "Capítulo " + entry.getValue());
        }
        Map<UUID, String> sectionNumbers = computeSectionNumbers(chapters, chapterNumbers);
        for (Map.Entry<UUID, String> entry : sectionNumbers.entrySet()) {
            result.put(entry.getKey(), "Seção " + entry.getValue());
        }
        return result;
    }
}
