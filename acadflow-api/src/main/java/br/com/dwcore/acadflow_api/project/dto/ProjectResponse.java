package br.com.dwcore.acadflow_api.project.dto;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.project.domain.Project;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ProjectResponse(
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
        String status,
        int progress,
        int totalChapters,
        int completedChapters,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String templateProfile
) {
    public static ProjectResponse from(Project project) {
        List<Chapter> chapters = project.getChapters();
        return new ProjectResponse(
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
                project.getStatus().name(),
                calculateProgress(chapters),
                chapters.size(),
                (int) chapters.stream().filter(c -> c.getStatus() == ChapterStatus.APPROVED).count(),
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
