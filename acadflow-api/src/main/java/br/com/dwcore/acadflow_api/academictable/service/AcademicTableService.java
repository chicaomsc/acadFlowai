package br.com.dwcore.acadflow_api.academictable.service;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTable;
import br.com.dwcore.acadflow_api.academictable.dto.AcademicTableResponse;
import br.com.dwcore.acadflow_api.academictable.dto.CreateAcademicTableRequest;
import br.com.dwcore.acadflow_api.academictable.dto.UpdateAcademicTableRequest;
import br.com.dwcore.acadflow_api.academictable.repository.AcademicTableRepository;
import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.shared.exception.BusinessException;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AcademicTableService {

    private final AcademicTableRepository tableRepository;
    private final ProjectRepository projectRepository;
    private final ChapterRepository chapterRepository;
    private final UserService userService;

    @Transactional
    public AcademicTableResponse create(UUID projectId, CreateAcademicTableRequest request, String userEmail) {
        User user = userService.findEntityByEmail(userEmail);

        Project project = projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Projeto não encontrado"));

        Chapter chapter = chapterRepository.findById(request.chapterId())
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado"));

        if (!chapter.getProject().getId().equals(project.getId())) {
            throw new BusinessException("Capítulo não pertence ao projeto especificado");
        }

        if (request.title().isBlank()) {
            throw new BusinessException("O título não pode ser vazio");
        }

        if (request.content().isBlank()) {
            throw new BusinessException("O conteúdo não pode ser vazio");
        }

        AcademicTable table = AcademicTable.builder()
                .project(project)
                .chapter(chapter)
                .type(request.type())
                .title(request.title().trim())
                .sourceText(request.sourceText() != null && !request.sourceText().isBlank()
                        ? request.sourceText().trim() : null)
                .content(request.content().trim())
                .build();

        return AcademicTableResponse.from(tableRepository.save(table));
    }

    @Transactional(readOnly = true)
    public List<AcademicTableResponse> findByProject(UUID projectId, String userEmail) {
        User user = userService.findEntityByEmail(userEmail);

        projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Projeto não encontrado"));

        return tableRepository.findByProjectIdOrderByCreatedAtAsc(projectId)
                .stream().map(AcademicTableResponse::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AcademicTableResponse> findByChapter(UUID chapterId, String userEmail) {
        User user = userService.findEntityByEmail(userEmail);

        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado"));

        if (chapter.getProject().getDeletedAt() != null) {
            throw new ResourceNotFoundException("Projeto não encontrado");
        }

        if (!chapter.getProject().getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Capítulo não encontrado");
        }

        return tableRepository.findByChapterIdOrderByCreatedAtAsc(chapterId)
                .stream().map(AcademicTableResponse::from).collect(Collectors.toList());
    }

    @Transactional
    public AcademicTableResponse update(UUID tableId, UpdateAcademicTableRequest request, String userEmail) {
        User user = userService.findEntityByEmail(userEmail);

        AcademicTable table = tableRepository.findByIdAndProjectUserId(tableId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tabela não encontrada"));

        if (request.type() != null) {
            table.setType(request.type());
        }

        if (request.title() != null) {
            if (request.title().isBlank()) {
                throw new BusinessException("O título não pode ser vazio");
            }
            table.setTitle(request.title().trim());
        }

        if (request.sourceText() != null) {
            table.setSourceText(request.sourceText().isBlank() ? null : request.sourceText().trim());
        }

        if (request.content() != null) {
            if (request.content().isBlank()) {
                throw new BusinessException("O conteúdo não pode ser vazio");
            }
            table.setContent(request.content().trim());
        }

        return AcademicTableResponse.from(tableRepository.save(table));
    }

    @Transactional
    public void delete(UUID tableId, String userEmail) {
        User user = userService.findEntityByEmail(userEmail);

        AcademicTable table = tableRepository.findByIdAndProjectUserId(tableId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tabela não encontrada"));

        tableRepository.delete(table);
    }

    public List<AcademicTable> findEntitiesByProject(UUID projectId) {
        return tableRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
    }
}
