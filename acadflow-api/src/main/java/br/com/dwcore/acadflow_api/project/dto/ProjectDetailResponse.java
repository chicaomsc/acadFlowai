package br.com.dwcore.acadflow_api.project.dto;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.dto.ChapterResponse;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.reference.domain.Reference;
import br.com.dwcore.acadflow_api.reference.dto.ReferenceResponse;
import br.com.dwcore.acadflow_api.timeline.domain.TaskStatus;
import br.com.dwcore.acadflow_api.timeline.domain.TimelineTask;
import br.com.dwcore.acadflow_api.timeline.dto.TaskResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ProjectDetailResponse(
        UUID id,
        String title,
        String subtitle,
        String course,
        String institution,
        String advisorName,
        String norm,
        String academicDegree,
        LocalDate deadline,
        String defenseCity,
        Integer defenseYear,
        String keywords,
        String theme,
        String researchProblem,
        String generalObjective,
        String specificObjectives,
        String abstractPt,
        String abstractEn,
        String status,
        int progress,
        int totalChapters,
        int completedChapters,
        List<ChapterResponse> chapters,
        List<ReferenceResponse> references,
        List<TaskResponse> timelineTasks,
        int totalReferences,
        int citedReferences,
        int pendingReferences,
        int totalTasks,
        int completedTasks,
        int pendingTasks,
        boolean exportReady,
        int exportProgress,
        List<String> pendingExportItems,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String templateProfile
) {
    public static ProjectDetailResponse from(Project project) {
        return from(project, List.of(), List.of(), false, 0, List.of());
    }

    public static ProjectDetailResponse from(
            Project project,
            List<Reference> references,
            List<TimelineTask> tasks,
            boolean exportReady,
            int exportProgress,
            List<String> pendingExportItems) {

        List<Chapter> chapters = project.getChapters();
        int totalRef = references.size();
        int cited = (int) references.stream().filter(Reference::isHasCitation).count();
        int totalTask = tasks.size();
        int doneTasks = (int) tasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();

        return new ProjectDetailResponse(
                project.getId(),
                project.getTitle(),
                project.getSubtitle(),
                project.getCourse(),
                project.getInstitution(),
                project.getAdvisorName(),
                project.getNorm().name(),
                project.getAcademicDegree() != null ? project.getAcademicDegree().name() : null,
                project.getDeadline(),
                project.getDefenseCity(),
                project.getDefenseYear(),
                project.getKeywords(),
                project.getTheme(),
                project.getResearchProblem(),
                project.getGeneralObjective(),
                project.getSpecificObjectives(),
                project.getAbstractPt(),
                project.getAbstractEn(),
                project.getStatus().name(),
                calculateProgress(chapters),
                chapters.size(),
                (int) chapters.stream().filter(c -> c.getStatus() == ChapterStatus.APPROVED).count(),
                chapters.stream().map(ChapterResponse::from).toList(),
                references.stream().map(ReferenceResponse::from).toList(),
                tasks.stream().map(TaskResponse::from).toList(),
                totalRef,
                cited,
                totalRef - cited,
                totalTask,
                doneTasks,
                totalTask - doneTasks,
                exportReady,
                exportProgress,
                pendingExportItems,
                project.getCreatedAt(),
                project.getUpdatedAt(),
                project.getTemplateProfile() != null ? project.getTemplateProfile().name() : null
        );
    }

    private static int calculateProgress(List<Chapter> chapters) {
        if (chapters.isEmpty()) return 0;
        int total = chapters.stream().mapToInt(c -> switch (c.getStatus()) {
            case NOT_STARTED -> 0;
            case WRITING -> 25;
            case REVIEW -> 75;
            case APPROVED -> 100;
        }).sum();
        return total / chapters.size();
    }
}
