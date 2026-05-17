package br.com.dwcore.acadflow_api.project.service;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.project.dto.CreateProjectRequest;
import br.com.dwcore.acadflow_api.project.dto.ProjectDetailResponse;
import br.com.dwcore.acadflow_api.project.dto.ProjectResponse;
import br.com.dwcore.acadflow_api.project.dto.UpdateProjectRequest;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ChapterRepository chapterRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<ProjectResponse> findAll(String userEmail) {
        User user = userService.findEntityByEmail(userEmail);
        return projectRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(ProjectResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse findById(UUID projectId, String userEmail) {
        return ProjectResponse.from(getOwnedProject(projectId, userEmail));
    }

    @Transactional(readOnly = true)
    public ProjectDetailResponse findDetailById(UUID projectId, String userEmail) {
        return ProjectDetailResponse.from(getOwnedProject(projectId, userEmail));
    }

    @Transactional
    public ProjectDetailResponse create(CreateProjectRequest request, String userEmail) {
        User user = userService.findEntityByEmail(userEmail);

        Project project = Project.builder()
                .user(user)
                .title(request.title())
                .subtitle(request.subtitle())
                .course(request.course())
                .institution(request.institution())
                .advisorName(request.advisorName())
                .norm(request.norm())
                .academicDegree(request.academicDegree())
                .deadline(request.deadline())
                .defenseCity(request.defenseCity())
                .defenseYear(request.defenseYear())
                .theme(request.theme())
                .researchProblem(request.researchProblem())
                .generalObjective(request.generalObjective())
                .specificObjectives(request.specificObjectives())
                .abstractPt(request.abstractPt())
                .abstractEn(request.abstractEn())
                .keywords(request.keywords())
                .status(ProjectStatus.IN_PROGRESS)
                .build();

        project = projectRepository.save(project);

        List<Chapter> chapters = buildDefaultChapters(project);
        chapterRepository.saveAll(chapters);
        project.getChapters().addAll(chapters);

        return ProjectDetailResponse.from(project);
    }

    @Transactional
    public ProjectDetailResponse update(UUID projectId, UpdateProjectRequest request, String userEmail) {
        Project project = getOwnedProject(projectId, userEmail);
        if (request.title() != null)              project.setTitle(request.title());
        if (request.subtitle() != null)           project.setSubtitle(request.subtitle());
        if (request.course() != null)             project.setCourse(request.course());
        if (request.institution() != null)        project.setInstitution(request.institution());
        if (request.advisorName() != null)        project.setAdvisorName(request.advisorName());
        if (request.norm() != null)               project.setNorm(request.norm());
        if (request.academicDegree() != null)     project.setAcademicDegree(request.academicDegree());
        if (request.status() != null)             project.setStatus(request.status());
        if (request.deadline() != null)           project.setDeadline(request.deadline());
        if (request.defenseCity() != null)        project.setDefenseCity(request.defenseCity());
        if (request.defenseYear() != null)        project.setDefenseYear(request.defenseYear());
        if (request.theme() != null)              project.setTheme(request.theme());
        if (request.researchProblem() != null)    project.setResearchProblem(request.researchProblem());
        if (request.generalObjective() != null)   project.setGeneralObjective(request.generalObjective());
        if (request.specificObjectives() != null) project.setSpecificObjectives(request.specificObjectives());
        if (request.abstractPt() != null)         project.setAbstractPt(request.abstractPt());
        if (request.abstractEn() != null)         project.setAbstractEn(request.abstractEn());
        if (request.keywords() != null)           project.setKeywords(request.keywords());
        return ProjectDetailResponse.from(projectRepository.save(project));
    }

    @Transactional
    public void softDelete(UUID projectId, String userEmail) {
        Project project = getOwnedProject(projectId, userEmail);
        project.setDeletedAt(LocalDateTime.now());
        projectRepository.save(project);
    }

    private Project getOwnedProject(UUID projectId, String userEmail) {
        User user = userService.findEntityByEmail(userEmail);
        return projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Projeto não encontrado"));
    }

    private List<Chapter> buildDefaultChapters(Project project) {
        return List.of(
                chapter(project, "Introdução",              ChapterType.INTRODUCTION,          1, 2000),
                chapter(project, "Fundamentação Teórica",   ChapterType.THEORETICAL_FOUNDATION, 2, 5000),
                chapter(project, "Metodologia",             ChapterType.METHODOLOGY,            3, 3000),
                chapter(project, "Resultados e Discussão",  ChapterType.RESULTS,                4, 4000),
                chapter(project, "Conclusão",               ChapterType.CONCLUSION,             5, 2000),
                chapter(project, "Referências",             ChapterType.REFERENCES,             6, 500)
        );
    }

    private Chapter chapter(Project project, String title, ChapterType type, int order, int target) {
        return Chapter.builder()
                .project(project)
                .title(title)
                .type(type)
                .status(ChapterStatus.NOT_STARTED)
                .orderIndex(order)
                .wordCount(0)
                .targetWordCount(target)
                .build();
    }
}
