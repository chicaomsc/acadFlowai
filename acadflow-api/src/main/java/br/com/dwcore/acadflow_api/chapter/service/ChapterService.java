package br.com.dwcore.acadflow_api.chapter.service;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.dto.ChapterResponse;
import br.com.dwcore.acadflow_api.chapter.dto.UpdateChapterRequest;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.chapter.dto.UpdateChapterStatusRequest;
import br.com.dwcore.acadflow_api.shared.exception.ForbiddenException;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChapterService {

    private final ChapterRepository chapterRepository;
    private final ProjectRepository projectRepository;
    private final UserService userService;

    public List<ChapterResponse> findByProjectId(UUID projectId, String userEmail) {
        var user = userService.findEntityByEmail(userEmail);
        projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Projeto não encontrado"));
        return chapterRepository.findByProjectIdOrderByOrderIndexAsc(projectId)
                .stream().map(ChapterResponse::from).toList();
    }

    public ChapterResponse findById(UUID chapterId, String userEmail) {
        Chapter chapter = getChapterOrThrow(chapterId);
        verifyOwnership(chapter, userEmail);
        return ChapterResponse.from(chapter);
    }

    @Transactional
    public ChapterResponse update(UUID chapterId, UpdateChapterRequest request, String userEmail) {
        Chapter chapter = getChapterOrThrow(chapterId);
        verifyOwnership(chapter, userEmail);

        String content = request.content();
        chapter.setContent(content);
        chapter.setWordCount(countWords(content));
        chapter.setLastEditedAt(LocalDateTime.now());
        chapter.setStatus(isBlank(content) ? ChapterStatus.NOT_STARTED : ChapterStatus.WRITING);

        return ChapterResponse.from(chapterRepository.save(chapter));
    }

    private Chapter getChapterOrThrow(UUID id) {
        return chapterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado"));
    }

    @Transactional
    public ChapterResponse updateStatus(UUID chapterId, UpdateChapterStatusRequest request, String userEmail) {
        Chapter chapter = getChapterOrThrow(chapterId);
        verifyOwnership(chapter, userEmail);
        chapter.setStatus(request.status());
        return ChapterResponse.from(chapterRepository.save(chapter));
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
