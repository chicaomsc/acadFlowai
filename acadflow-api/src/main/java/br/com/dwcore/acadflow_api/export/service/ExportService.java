package br.com.dwcore.acadflow_api.export.service;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTable;
import br.com.dwcore.acadflow_api.academictable.repository.AcademicTableRepository;
import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.citation.repository.CitationRepository;
import br.com.dwcore.acadflow_api.export.docx.DocxBuilder;
import br.com.dwcore.acadflow_api.export.docx.dto.LoadedFigure;
import br.com.dwcore.acadflow_api.export.dto.CreateExportRequest;
import br.com.dwcore.acadflow_api.export.dto.ExportArtifactResponse;
import br.com.dwcore.acadflow_api.export.dto.ExportStatusResponse;
import br.com.dwcore.acadflow_api.figure.domain.Figure;
import br.com.dwcore.acadflow_api.figure.repository.FigureRepository;
import br.com.dwcore.acadflow_api.figure.service.FigureStorageService;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.reference.domain.Reference;
import br.com.dwcore.acadflow_api.reference.repository.ReferenceRepository;
import br.com.dwcore.acadflow_api.shared.exception.BusinessException;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.user.service.UserService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExportService {

    private static final String UUID_PAT =
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

    private static final Pattern CITE_MARKER = Pattern.compile(
            "\\[\\[@CITE:(" + UUID_PAT + ")\\]\\]"
    );

    private static final Pattern FIG_MARKER = Pattern.compile(
            "\\[\\[@FIG:(" + UUID_PAT + ")\\]\\]"
    );

    private static final Pattern TABLE_QUADRO_MARKER = Pattern.compile(
            "\\[\\[@(?:TABLE|QUADRO):(" + UUID_PAT + ")\\]\\]"
    );

    private static final Pattern XREF_MARKER = Pattern.compile(
            "\\[\\[@XREF:(FIG|TABLE|QUADRO|CHAPTER|SECTION):(" + UUID_PAT + ")\\]\\]"
    );

    private static final Set<ChapterType> REQUIRED_TEXTUAL_TYPES = Set.of(
            ChapterType.INTRODUCTION,
            ChapterType.THEORETICAL_FOUNDATION,
            ChapterType.METHODOLOGY,
            ChapterType.RESULTS,
            ChapterType.CONCLUSION
    );
    private static final int REQUIRED_METADATA_FIELDS = 7;

    private final ProjectRepository projectRepository;
    private final ChapterRepository chapterRepository;
    private final ReferenceRepository referenceRepository;
    private final CitationRepository citationRepository;
    private final FigureRepository figureRepository;
    private final FigureStorageService figureStorageService;
    private final AcademicTableRepository tableRepository;
    private final UserService userService;
    private final DocxBuilder docxBuilder;

    @Value("${app.export.dir}")
    private String exportDir;

    @PostConstruct
    void initExportDir() {
        Path resolved = Paths.get(exportDir).toAbsolutePath().normalize();
        Path tmpDir = Paths.get(System.getProperty("java.io.tmpdir")).toAbsolutePath().normalize();
        log.info("Export directory: {}", resolved);
        if (resolved.startsWith(tmpDir)) {
            log.warn("app.export.dir está sob o diretório temporário do sistema ({}). " +
                     "Arquivos exportados podem ser removidos pelo SO. " +
                     "Configure EXPORT_DIR para um diretório persistente em produção.", resolved);
        }
    }

    public ExportStatusResponse getExportStatus(UUID projectId, String format, String userEmail) {
        Project project = getOwnedProject(projectId, userEmail);
        return calculateStatus(project, format);
    }

    public ExportArtifactResponse createExport(CreateExportRequest request, String userEmail) {
        Project project = getOwnedProject(request.projectId(), userEmail);
        ExportStatusResponse status = calculateStatus(project, request.format());

        if (!status.ready()) {
            throw new BusinessException("Projeto possui pendências que impedem a exportação");
        }

        if (!"docx".equalsIgnoreCase(request.format())) {
            throw new BusinessException("Exportação real disponível apenas para DOCX. PDF e slides em breve.");
        }

        String fileName = generateFileName(project.getTitle(), request.format());
        List<Chapter> chapters = chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId());
        List<Reference> references = referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId());
        List<Citation> citations = citationRepository.findByProjectId(project.getId());
        Map<UUID, Citation> citationLookup = citations.stream()
                .collect(Collectors.toMap(Citation::getId, c -> c));

        List<Figure> figures = figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId());
        Map<UUID, LoadedFigure> figureLookup = new HashMap<>();
        for (Figure f : figures) {
            try {
                byte[] data = figureStorageService.load(f.getStorageKey());
                figureLookup.put(f.getId(), new LoadedFigure(f, data));
            } catch (IOException e) {
                log.warn("Figura {} não pôde ser carregada do storage: {}", f.getId(), e.getMessage());
            }
        }

        List<AcademicTable> academicTables = tableRepository.findByProjectIdOrderByCreatedAtAsc(project.getId());
        Map<UUID, AcademicTable> tableLookup = academicTables.stream()
                .collect(Collectors.toMap(AcademicTable::getId, t -> t));

        try {
            byte[] content = docxBuilder.build(project, chapters, references, citationLookup, figureLookup, tableLookup);
            saveFile(project.getId(), fileName, content);
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao gerar arquivo DOCX", e);
        }
        String downloadUrl = "/exports/download/" + project.getId() + "/" + fileName;
        return new ExportArtifactResponse(project.getId(), request.format(), fileName, downloadUrl, LocalDateTime.now());
    }

    public Resource loadFile(UUID projectId, String fileName, String userEmail) {
        getOwnedProject(projectId, userEmail);

        Path base = Paths.get(exportDir).resolve(projectId.toString()).toAbsolutePath().normalize();
        Path filePath = base.resolve(Paths.get(fileName).getFileName()).normalize();

        if (!filePath.startsWith(base)) {
            throw new ResourceNotFoundException("Arquivo não encontrado");
        }

        Resource resource = new FileSystemResource(filePath.toFile());
        if (!resource.exists() || !resource.isReadable()) {
            throw new ResourceNotFoundException("Arquivo de exportação não encontrado");
        }
        return resource;
    }

    public ExportStatusResponse calculateStatus(Project project, String format) {
        List<Chapter> chapters = chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId());
        List<Reference> references = referenceRepository.findByProjectIdOrderByCreatedAtDesc(project.getId());

        List<String> pendingItems = new ArrayList<>();
        List<String> completedItems = new ArrayList<>();

        int metadataCoverage = checkMetadata(project, pendingItems, completedItems);
        int chapterCoverage = checkTextualChapters(chapters, pendingItems, completedItems);
        int referenceCoverage = checkReferences(references, pendingItems, completedItems);
        checkOrphanCitationMarkers(project.getId(), chapters, pendingItems);
        checkOrphanFigureMarkers(project.getId(), chapters, pendingItems);
        checkOrphanTableMarkers(project.getId(), chapters, pendingItems);
        checkOrphanXrefMarkers(project.getId(), chapters, pendingItems);

        return new ExportStatusResponse(
                project.getId(),
                format,
                pendingItems.isEmpty(),
                (metadataCoverage + chapterCoverage + referenceCoverage) / 3,
                pendingItems,
                completedItems,
                metadataCoverage,
                chapterCoverage,
                referenceCoverage
        );
    }

    private int checkMetadata(Project project, List<String> pending, List<String> completed) {
        int filled = 0;

        if (project.getTitle() != null && !project.getTitle().isBlank()) filled++;
        else pending.add("Título não informado");

        if (project.getInstitution() != null && !project.getInstitution().isBlank()) filled++;
        else pending.add("Instituição não informada");

        if (project.getCourse() != null && !project.getCourse().isBlank()) filled++;
        else pending.add("Curso não informado");

        if (project.getAdvisorName() != null && !project.getAdvisorName().isBlank()) filled++;
        else pending.add("Orientador não informado");

        if (project.getDefenseCity() != null && !project.getDefenseCity().isBlank()) filled++;
        else pending.add("Cidade de defesa não informada");

        if (project.getDefenseYear() != null) filled++;
        else pending.add("Ano de defesa não informado");

        if (project.getAbstractPt() != null && !project.getAbstractPt().isBlank()) filled++;
        else pending.add("Resumo em português não preenchido");

        if (filled == REQUIRED_METADATA_FIELDS) {
            completed.add("Todos os metadados obrigatórios preenchidos");
        }
        return filled * 100 / REQUIRED_METADATA_FIELDS;
    }

    private int checkTextualChapters(List<Chapter> chapters, List<String> pending, List<String> completed) {
        List<Chapter> required = chapters.stream()
                .filter(c -> (c.getLevel() == null || c.getLevel() <= 1)
                        && REQUIRED_TEXTUAL_TYPES.contains(c.getType()))
                .toList();

        if (required.isEmpty()) {
            pending.add("Nenhum capítulo textual obrigatório encontrado");
            return 0;
        }

        long withContent = required.stream()
                .filter(c -> c.getContent() != null && !c.getContent().isBlank())
                .count();

        required.stream()
                .filter(c -> c.getContent() == null || c.getContent().isBlank())
                .forEach(c -> pending.add("Capítulo '" + c.getTitle() + "' sem conteúdo"));

        if (withContent == required.size()) {
            completed.add("Todos os " + required.size() + " capítulos obrigatórios com conteúdo");
        }

        return (int) (withContent * 100 / required.size());
    }

    private int checkReferences(List<Reference> references, List<String> pending, List<String> completed) {
        if (references.isEmpty()) {
            pending.add("Nenhuma referência cadastrada");
            return 0;
        }

        long withCitation = references.stream().filter(Reference::isHasCitation).count();
        long withoutCitation = references.size() - withCitation;

        completed.add(references.size() + " referência(s) cadastrada(s)");

        if (withoutCitation > 0) {
            pending.add(withoutCitation + " referência(s) sem citação no texto");
        } else {
            completed.add("Todas as " + references.size() + " referências citadas");
        }

        return (int) (withCitation * 100 / references.size());
    }

    private void checkOrphanCitationMarkers(UUID projectId, List<Chapter> chapters, List<String> pending) {
        List<Citation> citations = citationRepository.findByProjectId(projectId);
        Set<UUID> knownIds = citations.stream()
                .map(Citation::getId)
                .collect(Collectors.toSet());

        for (Chapter chapter : chapters) {
            if (chapter.getContent() == null || chapter.getContent().isBlank()) continue;
            Matcher m = CITE_MARKER.matcher(chapter.getContent());
            while (m.find()) {
                UUID markerId = UUID.fromString(m.group(1));
                if (!knownIds.contains(markerId)) {
                    pending.add("Capítulo '" + chapter.getTitle() + "' possui citação inválida ou removida");
                    break;
                }
            }
        }
    }

    private void checkOrphanFigureMarkers(UUID projectId, List<Chapter> chapters, List<String> pending) {
        List<Figure> figures = figureRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
        Map<UUID, Figure> knownFigs = figures.stream()
                .collect(Collectors.toMap(Figure::getId, f -> f));
        Set<UUID> storageMissingReported = new HashSet<>();

        for (Chapter chapter : chapters) {
            if (chapter.getContent() == null || chapter.getContent().isBlank()) continue;
            Matcher m = FIG_MARKER.matcher(chapter.getContent());
            boolean orphanReported = false;
            while (m.find()) {
                UUID markerId = UUID.fromString(m.group(1));
                Figure fig = knownFigs.get(markerId);
                if (fig == null) {
                    if (!orphanReported) {
                        pending.add("Capítulo '" + chapter.getTitle() + "' possui figura inválida ou removida");
                        orphanReported = true;
                    }
                } else if (!storageMissingReported.contains(fig.getId())
                        && !figureStorageService.exists(fig.getStorageKey())) {
                    pending.add("Figura '" + fig.getCaption() + "' não possui arquivo disponível");
                    storageMissingReported.add(fig.getId());
                }
            }
        }
    }

    private void checkOrphanTableMarkers(UUID projectId, List<Chapter> chapters, List<String> pending) {
        List<AcademicTable> tables = tableRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
        Set<UUID> knownIds = tables.stream()
                .map(AcademicTable::getId)
                .collect(Collectors.toSet());

        for (Chapter chapter : chapters) {
            if (chapter.getContent() == null || chapter.getContent().isBlank()) continue;
            Matcher m = TABLE_QUADRO_MARKER.matcher(chapter.getContent());
            boolean orphanReported = false;
            while (m.find()) {
                UUID markerId = UUID.fromString(m.group(1));
                if (!knownIds.contains(markerId) && !orphanReported) {
                    pending.add("Capítulo '" + chapter.getTitle() + "' possui tabela/quadro inválido ou removido");
                    orphanReported = true;
                }
            }
        }
    }

    private void checkOrphanXrefMarkers(UUID projectId, List<Chapter> chapters, List<String> pending) {
        Set<UUID> knownFigures = figureRepository.findByProjectIdOrderByCreatedAtAsc(projectId)
                .stream().map(Figure::getId).collect(Collectors.toSet());
        Set<UUID> knownTables = tableRepository.findByProjectIdOrderByCreatedAtAsc(projectId)
                .stream().map(AcademicTable::getId).collect(Collectors.toSet());
        Set<UUID> knownChapters = chapters.stream()
                .filter(c -> c.getLevel() == null || c.getLevel() <= 1)
                .map(Chapter::getId).collect(Collectors.toSet());
        Set<UUID> knownSections = chapters.stream()
                .filter(c -> Integer.valueOf(2).equals(c.getLevel()))
                .map(Chapter::getId).collect(Collectors.toSet());

        for (Chapter chapter : chapters) {
            if (chapter.getContent() == null || chapter.getContent().isBlank()) continue;
            Matcher m = XREF_MARKER.matcher(chapter.getContent());
            boolean reported = false;
            while (m.find() && !reported) {
                String subType = m.group(1);
                UUID targetId = UUID.fromString(m.group(2));
                boolean valid = switch (subType) {
                    case "FIG"              -> knownFigures.contains(targetId);
                    case "TABLE", "QUADRO"  -> knownTables.contains(targetId);
                    case "CHAPTER"          -> knownChapters.contains(targetId);
                    case "SECTION"          -> knownSections.contains(targetId);
                    default                 -> false;
                };
                if (!valid) {
                    pending.add("Capítulo '" + chapter.getTitle()
                            + "' possui referência cruzada inválida ou removida");
                    reported = true;
                }
            }
        }
    }

    private Project getOwnedProject(UUID projectId, String userEmail) {
        var user = userService.findEntityByEmail(userEmail);
        return projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Projeto não encontrado"));
    }

    private void saveFile(UUID projectId, String fileName, byte[] content) throws IOException {
        Path dir = Paths.get(exportDir).resolve(projectId.toString());
        Files.createDirectories(dir);
        Files.write(dir.resolve(fileName), content);
    }

    private String generateFileName(String title, String format) {
        String normalized = Normalizer.normalize(title, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}", "");
        String sanitized = normalized.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", "")
                .replaceAll("\\s+", "_")
                .trim();
        String ext = switch (format.toLowerCase()) {
            case "slides" -> "pptx";
            case "docx" -> "docx";
            default -> format.toLowerCase();
        };
        return sanitized + "." + ext;
    }
}
