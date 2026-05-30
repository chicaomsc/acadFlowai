package br.com.dwcore.acadflow_api.export.template;

import br.com.dwcore.acadflow_api.project.domain.AcademicDegree;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.domain.UserPlan;
import br.com.dwcore.acadflow_api.user.domain.UserRole;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AcademicTemplateResolverTest {

    private final AcademicTemplateResolver resolver = new AcademicTemplateResolver();

    private Project project(AcademicTemplateType profile) {
        return Project.builder()
                .id(UUID.randomUUID())
                .user(User.builder().id(UUID.randomUUID()).name("Test").email("t@t.com")
                        .password("h").role(UserRole.STUDENT).plan(UserPlan.FREE).build())
                .title("T").course("C").institution("I")
                .norm(AcademicNorm.ABNT).academicDegree(AcademicDegree.GRADUACAO)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>())
                .templateProfile(profile)
                .build();
    }

    @Test
    void nullProfileResolvesToAbntGeneric() {
        AcademicTemplate t = resolver.resolve(project(null));
        assertThat(t.type()).isEqualTo(AcademicTemplateType.ABNT_GENERIC);
    }

    @Test
    void abntGenericProfileResolvesToAbntGeneric() {
        AcademicTemplate t = resolver.resolve(project(AcademicTemplateType.ABNT_GENERIC));
        assertThat(t.type()).isEqualTo(AcademicTemplateType.ABNT_GENERIC);
        assertThat(t).isSameAs(AcademicTemplateRegistry.ABNT_GENERIC);
    }

    @Test
    void femafProfileResolvesToFemaf() {
        AcademicTemplate t = resolver.resolve(project(AcademicTemplateType.FEMAF));
        assertThat(t.type()).isEqualTo(AcademicTemplateType.FEMAF);
        assertThat(t).isSameAs(AcademicTemplateRegistry.FEMAF);
    }

    @Test
    void resolvedTemplateHasAllSectionLabels() {
        AcademicTemplate t = resolver.resolve(project(AcademicTemplateType.FEMAF));
        assertThat(t.resumoLabel()).isNotBlank();
        assertThat(t.abstractLabel()).isNotBlank();
        assertThat(t.summaryLabel()).isNotBlank();
        assertThat(t.figureListLabel()).isNotBlank();
        assertThat(t.referencesLabel()).isNotBlank();
        assertThat(t.natureStatementPattern()).isNotBlank();
    }
}
