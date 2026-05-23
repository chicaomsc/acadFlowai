package br.com.dwcore.acadflow_api.citation.service;

import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.citation.domain.CitationDisplayMode;
import br.com.dwcore.acadflow_api.citation.domain.CitationType;
import br.com.dwcore.acadflow_api.citation.dto.CitationResponse;
import br.com.dwcore.acadflow_api.citation.dto.CreateCitationRequest;
import br.com.dwcore.acadflow_api.citation.repository.CitationRepository;
import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.reference.domain.Reference;
import br.com.dwcore.acadflow_api.reference.repository.ReferenceRepository;
import br.com.dwcore.acadflow_api.shared.exception.BusinessException;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CitationService {

    private final CitationRepository citationRepository;
    private final ChapterRepository chapterRepository;
    private final ProjectRepository projectRepository;
    private final ReferenceRepository referenceRepository;
    private final UserService userService;

    @Transactional
    public CitationResponse create(UUID chapterId, CreateCitationRequest request, String userEmail) {
        var user = userService.findEntityByEmail(userEmail);

        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado"));

        // BUG-01: validates ownership AND that project is not soft-deleted (deletedAt IS NULL)
        Project project = projectRepository.findByIdAndUserId(chapter.getProject().getId(), user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado"));

        Reference reference = referenceRepository.findById(request.referenceId())
                .orElseThrow(() -> new ResourceNotFoundException("Referência não encontrada"));

        if (!reference.getProject().getId().equals(project.getId())) {
            throw new BusinessException("Referência não pertence ao mesmo projeto");
        }

        validateTypeConstraints(request);

        Citation citation = Citation.builder()
                .project(project)
                .chapter(chapter)
                .reference(reference)
                .type(request.type())
                .displayMode(request.displayMode() != null ? request.displayMode() : CitationDisplayMode.PARENTHETICAL)
                .pageNumber(request.pageNumber())
                .apudAuthor(request.apudAuthor())
                .apudYear(request.apudYear())
                .quotedText(request.quotedText())
                .build();

        Citation saved = citationRepository.save(citation);

        if (!reference.isHasCitation()) {
            reference.setHasCitation(true);
            referenceRepository.save(reference);
        }

        return CitationResponse.from(saved);
    }

    public List<CitationResponse> findByChapterId(UUID chapterId, String userEmail) {
        var user = userService.findEntityByEmail(userEmail);

        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado"));

        // BUG-01: validates ownership AND that project is not soft-deleted
        projectRepository.findByIdAndUserId(chapter.getProject().getId(), user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado"));

        return citationRepository.findByChapterIdOrderByCreatedAtAsc(chapterId)
                .stream().map(CitationResponse::from).toList();
    }

    public List<CitationResponse> findByProjectId(UUID projectId, String userEmail) {
        var user = userService.findEntityByEmail(userEmail);

        projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Projeto não encontrado"));

        return citationRepository.findByProjectId(projectId)
                .stream().map(CitationResponse::from).toList();
    }

    @Transactional
    public void delete(UUID citationId, String userEmail) {
        var user = userService.findEntityByEmail(userEmail);

        Citation citation = citationRepository.findById(citationId)
                .orElseThrow(() -> new ResourceNotFoundException("Citação não encontrada"));

        if (!citation.getProject().getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Citação não encontrada");
        }

        UUID referenceId = citation.getReference().getId();
        citationRepository.delete(citation);

        if (citationRepository.countByReferenceId(referenceId) == 0) {
            referenceRepository.findById(referenceId).ifPresent(ref -> {
                if (ref.isHasCitation()) {
                    ref.setHasCitation(false);
                    referenceRepository.save(ref);
                }
            });
        }
    }

    private void validateTypeConstraints(CreateCitationRequest request) {
        if (request.type() == CitationType.APUD) {
            if (request.apudAuthor() == null || request.apudAuthor().isBlank()) {
                throw new BusinessException("Citação APUD requer autor da obra original (apudAuthor)");
            }
            if (request.apudYear() == null || request.apudYear().isBlank()) {
                throw new BusinessException("Citação APUD requer ano da obra original (apudYear)");
            }
        }
        if (request.type() == CitationType.DIRECT_SHORT || request.type() == CitationType.DIRECT_LONG) {
            if (request.quotedText() == null || request.quotedText().isBlank()) {
                throw new BusinessException("Citação direta requer o trecho citado (quotedText)");
            }
        }
    }
}
