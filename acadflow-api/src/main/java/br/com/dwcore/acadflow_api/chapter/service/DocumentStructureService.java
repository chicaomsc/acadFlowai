package br.com.dwcore.acadflow_api.chapter.service;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.dto.ChapterNodeResponse;
import br.com.dwcore.acadflow_api.chapter.dto.DocumentStructureResponse;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.export.docx.AcademicNumberingService;
import br.com.dwcore.acadflow_api.export.docx.DocumentStructureBuilder;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentStructureService {

    private final ProjectRepository projectRepository;
    private final ChapterRepository chapterRepository;
    private final UserService userService;

    private final AcademicNumberingService academicNumberingService = new AcademicNumberingService();
    private final DocumentStructureBuilder documentStructureBuilder = new DocumentStructureBuilder();

    @Transactional(readOnly = true)
    public DocumentStructureResponse getDocumentStructure(UUID projectId, String userEmail) {
        User user = userService.findEntityByEmail(userEmail);
        Project project = projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Projeto não encontrado"));

        List<Chapter> allChapters = chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId());

        Map<UUID, Integer> chapterNumbers = academicNumberingService.computeChapterNumbers(allChapters);
        Map<UUID, String> sectionNumbers = academicNumberingService.computeSectionNumbers(allChapters, chapterNumbers);

        List<ChapterNodeResponse> nodes = documentStructureBuilder.build(allChapters).stream()
                .map(node -> toNodeResponse(node, chapterNumbers, sectionNumbers))
                .toList();

        return new DocumentStructureResponse(project.getId(), nodes);
    }

    private ChapterNodeResponse toNodeResponse(DocumentStructureBuilder.ChapterNode node,
                                                Map<UUID, Integer> chapterNumbers,
                                                Map<UUID, String> sectionNumbers) {
        Chapter ch = node.chapter();
        String numbering = resolveChapterNumbering(ch, chapterNumbers);

        List<ChapterNodeResponse> children = node.sections().stream()
                .map(s -> toSectionNodeResponse(s, sectionNumbers))
                .toList();

        return new ChapterNodeResponse(
                ch.getId(), ch.getTitle(), ch.getLevel(),
                numbering, ch.getStatus().name(), ch.getWordCount(), children);
    }

    private ChapterNodeResponse toSectionNodeResponse(Chapter section,
                                                       Map<UUID, String> sectionNumbers) {
        String numbering = sectionNumbers.getOrDefault(section.getId(), "?");
        return new ChapterNodeResponse(
                section.getId(), section.getTitle(), section.getLevel(),
                numbering, section.getStatus().name(), section.getWordCount(), List.of());
    }

    private String resolveChapterNumbering(Chapter chapter, Map<UUID, Integer> chapterNumbers) {
        if (chapter.getType() == ChapterType.REFERENCES) {
            return chapter.getTitle().toUpperCase();
        }
        Integer num = chapterNumbers.get(chapter.getId());
        return num != null ? String.valueOf(num) : "?";
    }
}
