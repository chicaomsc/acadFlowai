package br.com.dwcore.acadflow_api.project.dto;

import br.com.dwcore.acadflow_api.export.template.AcademicTemplateType;
import br.com.dwcore.acadflow_api.project.domain.AcademicDegree;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateProjectRequest(
        @NotBlank(message = "Título é obrigatório")
        @Size(max = 500, message = "Título deve ter no máximo 500 caracteres")
        String title,

        @NotBlank(message = "Curso é obrigatório")
        @Size(max = 255, message = "Curso deve ter no máximo 255 caracteres")
        String course,

        @NotBlank(message = "Instituição é obrigatória")
        @Size(max = 255, message = "Instituição deve ter no máximo 255 caracteres")
        String institution,

        @Size(max = 255, message = "Nome do orientador deve ter no máximo 255 caracteres")
        String advisorName,

        @NotNull(message = "Norma acadêmica é obrigatória")
        AcademicNorm norm,

        LocalDate deadline,
        String theme,
        String researchProblem,
        String generalObjective,
        String specificObjectives,

        @Size(max = 255) String subtitle,
        AcademicDegree academicDegree,
        @Size(max = 255) String defenseCity,
        Integer defenseYear,
        String abstractPt,
        String abstractEn,
        @Size(max = 500) String keywords,
        AcademicTemplateType templateProfile
) {}
