package br.com.dwcore.acadflow_api.figure.service;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.figure.domain.Figure;
import br.com.dwcore.acadflow_api.figure.dto.FigureResponse;
import br.com.dwcore.acadflow_api.figure.repository.FigureRepository;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.shared.exception.BusinessException;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FigureService {

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of("image/jpeg", "image/png");

    private final FigureRepository figureRepository;
    private final FigureStorageService figureStorageService;
    private final ProjectRepository projectRepository;
    private final ChapterRepository chapterRepository;
    private final UserService userService;

    @Value("${app.figures.max-size-mb:10}")
    private int maxSizeMb;

    public record ImageData(byte[] bytes, String mimeType) {}

    @Transactional
    public FigureResponse create(UUID projectId, UUID chapterId, MultipartFile file,
                                  String caption, String sourceText, Integer widthPercent,
                                  String userEmail) throws IOException {
        var user = userService.findEntityByEmail(userEmail);
        Project project = projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Projeto não encontrado"));

        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado"));
        if (!chapter.getProject().getId().equals(project.getId())) {
            throw new BusinessException("Capítulo não pertence ao projeto");
        }

        if (caption == null || caption.isBlank()) {
            throw new BusinessException("Legenda é obrigatória");
        }
        if (widthPercent != null && (widthPercent < 30 || widthPercent > 100)) {
            throw new BusinessException("widthPercent deve estar entre 30 e 100");
        }
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Arquivo é obrigatório");
        }
        long maxBytes = (long) maxSizeMb * 1024L * 1024L;
        if (file.getSize() > maxBytes) {
            throw new BusinessException("Arquivo excede o tamanho máximo de " + maxSizeMb + "MB");
        }

        byte[] bytes = file.getBytes();
        String mimeType = detectMimeType(bytes);
        if (!ALLOWED_MIME_TYPES.contains(mimeType)) {
            throw new BusinessException("Formato não suportado. Use PNG ou JPEG.");
        }

        UUID figureId = UUID.randomUUID();
        String extension = mimeType.contains("png") ? "png" : "jpg";
        String storageKey = figureStorageService.store(projectId, figureId, extension, bytes);

        Figure figure = Figure.builder()
                .id(figureId)
                .project(project)
                .chapter(chapter)
                .caption(caption.trim())
                .sourceText(sourceText != null && !sourceText.isBlank() ? sourceText.trim() : null)
                .storageKey(storageKey)
                .originalFilename(file.getOriginalFilename())
                .mimeType(mimeType)
                .fileSizeBytes(file.getSize())
                .widthPercent(widthPercent != null ? widthPercent : 100)
                .createdAt(LocalDateTime.now())
                .build();

        return FigureResponse.from(figureRepository.save(figure));
    }

    @Transactional(readOnly = true)
    public List<FigureResponse> findByProject(UUID projectId, String userEmail) {
        var user = userService.findEntityByEmail(userEmail);
        projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Projeto não encontrado"));
        return figureRepository.findByProjectIdOrderByCreatedAtAsc(projectId)
                .stream().map(FigureResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<FigureResponse> findByChapter(UUID chapterId, String userEmail) {
        var user = userService.findEntityByEmail(userEmail);
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado"));
        projectRepository.findByIdAndUserId(chapter.getProject().getId(), user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado"));
        return figureRepository.findByChapterIdOrderByCreatedAtAsc(chapterId)
                .stream().map(FigureResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ImageData loadImage(UUID projectId, UUID figureId, String userEmail) throws IOException {
        var user = userService.findEntityByEmail(userEmail);
        Figure figure = figureRepository.findByIdAndProjectUserId(figureId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Figura não encontrada"));
        if (!figure.getProject().getId().equals(projectId)) {
            throw new ResourceNotFoundException("Figura não encontrada");
        }
        byte[] data = figureStorageService.load(figure.getStorageKey());
        return new ImageData(data, figure.getMimeType());
    }

    @Transactional
    public void delete(UUID figureId, String userEmail) {
        var user = userService.findEntityByEmail(userEmail);
        Figure figure = figureRepository.findByIdAndProjectUserId(figureId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Figura não encontrada"));
        String storageKey = figure.getStorageKey();
        figureRepository.delete(figure);
        figureStorageService.delete(storageKey);
    }

    public List<Figure> findEntitiesByProject(UUID projectId) {
        return figureRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
    }

    private String detectMimeType(byte[] bytes) {
        if (bytes.length >= 8) {
            // PNG: 89 50 4E 47 0D 0A 1A 0A
            if (bytes[0] == (byte)0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) {
                return "image/png";
            }
            // JPEG: FF D8
            if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8) {
                return "image/jpeg";
            }
        }
        return "application/octet-stream";
    }
}
