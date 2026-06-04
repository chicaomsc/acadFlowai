package br.com.dwcore.acadflow_api.chapter.service;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.dto.ChapterResponse;
import br.com.dwcore.acadflow_api.chapter.dto.CreateSectionRequest;
import br.com.dwcore.acadflow_api.chapter.dto.UpdateSectionRequest;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.shared.exception.ForbiddenException;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SectionService {

    private final ChapterRepository chapterRepository;

    @Transactional
    public ChapterResponse createSection(UUID chapterId, CreateSectionRequest request, String userEmail) {
        Chapter parent = getChapterOrThrow(chapterId);
        verifyOwnership(parent, userEmail);

        Chapter section = Chapter.builder()
                .project(parent.getProject())
                .parent(parent)
                .title(request.title())
                .type(parent.getType())
                .status(ChapterStatus.NOT_STARTED)
                .level(2)
                .sectionOrder(request.sectionOrder())
                .orderIndex(0)
                .wordCount(0)
                .targetWordCount(parent.getTargetWordCount())
                .build();

        return ChapterResponse.from(chapterRepository.save(section));
    }

    @Transactional(readOnly = true)
    public List<ChapterResponse> findSectionsByChapter(UUID chapterId, String userEmail) {
        Chapter parent = getChapterOrThrow(chapterId);
        verifyOwnership(parent, userEmail);
        return chapterRepository.findByParentIdOrderBySectionOrderAsc(chapterId)
                .stream().map(ChapterResponse::from).toList();
    }

    @Transactional
    public ChapterResponse updateSection(UUID sectionId, UpdateSectionRequest request, String userEmail) {
        Chapter section = getSectionOrThrow(sectionId);
        verifyOwnership(section, userEmail);

        if (request.title() != null) section.setTitle(request.title());
        if (request.sectionOrder() != null) section.setSectionOrder(request.sectionOrder());
        if (request.content() != null) {
            section.setContent(request.content());
            section.setWordCount(countWords(request.content()));
            section.setLastEditedAt(LocalDateTime.now());
            section.setStatus(isBlank(request.content()) ? ChapterStatus.NOT_STARTED : ChapterStatus.WRITING);
        }

        return ChapterResponse.from(chapterRepository.save(section));
    }

    @Transactional
    public void deleteSection(UUID sectionId, String userEmail) {
        Chapter section = getSectionOrThrow(sectionId);
        verifyOwnership(section, userEmail);
        chapterRepository.delete(section);
    }

    private Chapter getSectionOrThrow(UUID id) {
        Chapter chapter = getChapterOrThrow(id);
        if (chapter.getLevel() != 2 || chapter.getParent() == null) {
            throw new ResourceNotFoundException("Seção não encontrada");
        }
        return chapter;
    }

    private Chapter getChapterOrThrow(UUID id) {
        return chapterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado"));
    }

    private void verifyOwnership(Chapter chapter, String userEmail) {
        if (!chapter.getProject().getUser().getEmail().equals(userEmail)) {
            throw new ForbiddenException("Acesso negado ao capítulo");
        }
        if (chapter.getProject().getDeletedAt() != null) {
            throw new ResourceNotFoundException("Projeto não encontrado");
        }
    }

    private int countWords(String content) {
        if (isBlank(content)) return 0;
        String text = content.replaceAll("<[^>]*>", " ").trim();
        if (text.isBlank()) return 0;
        return text.split("\\s+").length;
    }

    private boolean isBlank(String content) {
        return content == null || content.isBlank();
    }
}
