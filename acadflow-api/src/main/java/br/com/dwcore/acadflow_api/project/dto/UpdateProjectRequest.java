package br.com.dwcore.acadflow_api.project.dto;

import br.com.dwcore.acadflow_api.project.domain.AcademicDegree;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateProjectRequest(
        @Size(min = 1, max = 500) String title,
        @Size(min = 1, max = 255) String course,
        @Size(min = 1, max = 255) String institution,
        @Size(max = 255) String advisorName,
        AcademicNorm norm,
        LocalDate deadline,
        String theme,
        String researchProblem,
        String generalObjective,
        String specificObjectives,
        ProjectStatus status,

        @Size(max = 255) String subtitle,
        AcademicDegree academicDegree,
        @Size(max = 255) String defenseCity,
        Integer defenseYear,
        String abstractPt,
        String abstractEn,
        @Size(max = 500) String keywords
) {}
