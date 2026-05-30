package br.com.dwcore.acadflow_api.export.template;

import br.com.dwcore.acadflow_api.project.domain.Project;
import org.springframework.stereotype.Component;

@Component
public class AcademicTemplateResolver {

    /** Resolves the template for a project. Null templateProfile defaults to ABNT_GENERIC. */
    public AcademicTemplate resolve(Project project) {
        return AcademicTemplateRegistry.forType(project.getTemplateProfile());
    }
}
