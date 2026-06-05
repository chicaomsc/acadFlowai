package br.com.dwcore.acadflow_api.chapter;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.dto.ChapterNodeResponse;
import br.com.dwcore.acadflow_api.chapter.dto.DocumentStructureResponse;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.chapter.service.DocumentStructureService;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.domain.UserPlan;
import br.com.dwcore.acadflow_api.user.domain.UserRole;
import br.com.dwcore.acadflow_api.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentStructureServiceTest {

    @Mock private ProjectRepository projectRepository;
    @Mock private ChapterRepository chapterRepository;
    @Mock private UserService userService;

    @InjectMocks
    private DocumentStructureService documentStructureService;

    private User buildUser(String email) {
        return User.builder().id(UUID.randomUUID()).name("Aluno").email(email)
                .password("hash").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private Project buildProject(User owner) {
        return Project.builder().id(UUID.randomUUID()).user(owner).title("TCC")
                .course("CC").institution("UFBA").norm(AcademicNorm.ABNT)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();
    }

    private Project buildDeletedProject(User owner) {
        return Project.builder().id(UUID.randomUUID()).user(owner).title("TCC")
                .course("CC").institution("UFBA").norm(AcademicNorm.ABNT)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>())
                .deletedAt(LocalDateTime.now()).build();
    }

    private Chapter chapter(Project project, ChapterType type, int orderIndex, String title) {
        return Chapter.builder().id(UUID.randomUUID()).project(project)
                .title(title).type(type).status(ChapterStatus.WRITING)
                .orderIndex(orderIndex).wordCount(100).targetWordCount(2000).level(1).build();
    }

    private Chapter section(Project project, Chapter parent, int sectionOrder, String title) {
        return Chapter.builder().id(UUID.randomUUID()).project(project)
                .parent(parent).title(title).type(parent.getType())
                .status(ChapterStatus.NOT_STARTED).level(2)
                .orderIndex(0).sectionOrder(sectionOrder).wordCount(0).targetWordCount(2000).build();
    }

    @Test
    void shouldReturnEmptyStructureForEmptyProject() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(List.of());

        DocumentStructureResponse response =
                documentStructureService.getDocumentStructure(project.getId(), user.getEmail());

        assertThat(response.projectId()).isEqualTo(project.getId());
        assertThat(response.chapters()).isEmpty();
    }

    @Test
    void shouldReturnChaptersWithCorrectNumbering() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter intro = chapter(project, ChapterType.INTRODUCTION, 1, "Introdução");
        Chapter method = chapter(project, ChapterType.METHODOLOGY, 2, "Metodologia");
        Chapter refs = chapter(project, ChapterType.REFERENCES, 3, "Referências");

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(List.of(intro, method, refs));

        DocumentStructureResponse response =
                documentStructureService.getDocumentStructure(project.getId(), user.getEmail());

        assertThat(response.chapters()).hasSize(3);
        ChapterNodeResponse introNode = response.chapters().get(0);
        assertThat(introNode.numbering()).isEqualTo("1");
        assertThat(introNode.title()).isEqualTo("Introdução");

        ChapterNodeResponse methodNode = response.chapters().get(1);
        assertThat(methodNode.numbering()).isEqualTo("2");

        ChapterNodeResponse refsNode = response.chapters().get(2);
        assertThat(refsNode.numbering()).isEqualTo("REFERÊNCIAS");
    }

    @Test
    void shouldReturnChaptersWithSections() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter intro = chapter(project, ChapterType.INTRODUCTION, 1, "Introdução");
        Chapter method = chapter(project, ChapterType.METHODOLOGY, 2, "Metodologia");
        Chapter s1 = section(project, intro, 1, "Contextualização");
        Chapter s2 = section(project, intro, 2, "Problema");
        Chapter s3 = section(project, method, 1, "Instrumentos");

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(List.of(intro, method, s1, s2, s3));

        DocumentStructureResponse response =
                documentStructureService.getDocumentStructure(project.getId(), user.getEmail());

        assertThat(response.chapters()).hasSize(2);

        ChapterNodeResponse introNode = response.chapters().get(0);
        assertThat(introNode.children()).hasSize(2);
        assertThat(introNode.children().get(0).numbering()).isEqualTo("1.1");
        assertThat(introNode.children().get(0).title()).isEqualTo("Contextualização");
        assertThat(introNode.children().get(1).numbering()).isEqualTo("1.2");
        assertThat(introNode.children().get(1).title()).isEqualTo("Problema");

        ChapterNodeResponse methodNode = response.chapters().get(1);
        assertThat(methodNode.children()).hasSize(1);
        assertThat(methodNode.children().get(0).numbering()).isEqualTo("2.1");
        assertThat(methodNode.children().get(0).title()).isEqualTo("Instrumentos");
    }

    @Test
    void shouldOrderChaptersByOrderIndex() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter c3 = chapter(project, ChapterType.RESULTS, 3, "Resultados");
        Chapter c1 = chapter(project, ChapterType.INTRODUCTION, 1, "Introdução");
        Chapter c2 = chapter(project, ChapterType.METHODOLOGY, 2, "Metodologia");

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(List.of(c1, c2, c3));

        DocumentStructureResponse response =
                documentStructureService.getDocumentStructure(project.getId(), user.getEmail());

        assertThat(response.chapters())
                .extracting(ChapterNodeResponse::numbering)
                .containsExactly("1", "2", "3");
    }

    @Test
    void shouldIncludeStatusAndWordCount() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter intro = chapter(project, ChapterType.INTRODUCTION, 1, "Introdução");

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findByProjectIdOrderByOrderIndexAsc(project.getId()))
                .thenReturn(List.of(intro));

        DocumentStructureResponse response =
                documentStructureService.getDocumentStructure(project.getId(), user.getEmail());

        ChapterNodeResponse node = response.chapters().get(0);
        assertThat(node.status()).isEqualTo(ChapterStatus.WRITING.name());
        assertThat(node.wordCount()).isEqualTo(100);
    }

    @Test
    void shouldThrowWhenProjectNotFound() {
        User user = buildUser("aluno@email.com");
        UUID projectId = UUID.randomUUID();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(any(), any())).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                documentStructureService.getDocumentStructure(projectId, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void shouldThrowWhenProjectIsDeleted() {
        User user = buildUser("aluno@email.com");
        Project deleted = buildDeletedProject(user);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        // findByIdAndUserId excludes deletedAt IS NOT NULL at the query level
        when(projectRepository.findByIdAndUserId(deleted.getId(), user.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                documentStructureService.getDocumentStructure(deleted.getId(), user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void shouldThrowWhenAnotherUserAccesses() {
        User other = buildUser("outro@email.com");
        UUID projectId = UUID.randomUUID();

        when(userService.findEntityByEmail(other.getEmail())).thenReturn(other);
        when(projectRepository.findByIdAndUserId(projectId, other.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                documentStructureService.getDocumentStructure(projectId, other.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
