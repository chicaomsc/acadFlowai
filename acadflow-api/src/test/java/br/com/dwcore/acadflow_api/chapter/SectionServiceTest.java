package br.com.dwcore.acadflow_api.chapter;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.dto.ChapterResponse;
import br.com.dwcore.acadflow_api.chapter.dto.CreateSectionRequest;
import br.com.dwcore.acadflow_api.chapter.dto.UpdateSectionRequest;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.chapter.service.SectionService;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.shared.exception.ForbiddenException;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.domain.UserPlan;
import br.com.dwcore.acadflow_api.user.domain.UserRole;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SectionServiceTest {

    @Mock private ChapterRepository chapterRepository;

    @InjectMocks
    private SectionService sectionService;

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

    private Chapter buildChapter(Project project) {
        return Chapter.builder().id(UUID.randomUUID()).project(project)
                .title("Introdução").type(ChapterType.INTRODUCTION)
                .status(ChapterStatus.NOT_STARTED).orderIndex(1)
                .wordCount(0).targetWordCount(2000).level(1).build();
    }

    private Chapter buildSection(Project project, Chapter parent) {
        return Chapter.builder().id(UUID.randomUUID()).project(project)
                .parent(parent).title("Seção 1.1").type(parent.getType())
                .status(ChapterStatus.NOT_STARTED).orderIndex(0)
                .sectionOrder(1).wordCount(0).targetWordCount(2000).level(2).build();
    }

    @Test
    void createSection_shouldPersistWithCorrectFields() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter parent = buildChapter(project);
        CreateSectionRequest request = new CreateSectionRequest("Contexto histórico", 1);

        when(chapterRepository.findById(parent.getId())).thenReturn(Optional.of(parent));
        when(chapterRepository.save(any(Chapter.class))).thenAnswer(inv -> inv.getArgument(0));

        ChapterResponse response = sectionService.createSection(parent.getId(), request, user.getEmail());

        assertThat(response.title()).isEqualTo("Contexto histórico");
        assertThat(response.level()).isEqualTo(2);
        assertThat(response.sectionOrder()).isEqualTo(1);
        assertThat(response.parentId()).isEqualTo(parent.getId());
        assertThat(response.status()).isEqualTo(ChapterStatus.NOT_STARTED.name());
    }

    @Test
    void createSection_shouldInheritChapterType() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter parent = buildChapter(project);
        parent.setType(ChapterType.METHODOLOGY);
        CreateSectionRequest request = new CreateSectionRequest("Instrumentos", 2);

        when(chapterRepository.findById(parent.getId())).thenReturn(Optional.of(parent));
        when(chapterRepository.save(any(Chapter.class))).thenAnswer(inv -> inv.getArgument(0));

        ChapterResponse response = sectionService.createSection(parent.getId(), request, user.getEmail());

        assertThat(response.type()).isEqualTo(ChapterType.METHODOLOGY.name());
    }

    @Test
    void createSection_shouldThrow_whenParentChapterNotFound() {
        UUID unknownId = UUID.randomUUID();
        when(chapterRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> sectionService.createSection(unknownId,
                new CreateSectionRequest("Título", 1), "user@email.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Capítulo não encontrado");
    }

    @Test
    void createSection_shouldThrow_whenUserIsNotOwner() {
        User owner = buildUser("dono@email.com");
        User intruder = buildUser("intruso@email.com");
        Project project = buildProject(owner);
        Chapter parent = buildChapter(project);

        when(chapterRepository.findById(parent.getId())).thenReturn(Optional.of(parent));

        assertThatThrownBy(() -> sectionService.createSection(parent.getId(),
                new CreateSectionRequest("Título", 1), intruder.getEmail()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Acesso negado");
    }

    @Test
    void findSectionsByChapter_shouldReturnOrderedSections() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter parent = buildChapter(project);
        Chapter s1 = buildSection(project, parent);
        Chapter s2 = buildSection(project, parent);
        s2.setSectionOrder(2);

        when(chapterRepository.findById(parent.getId())).thenReturn(Optional.of(parent));
        when(chapterRepository.findByParentIdOrderBySectionOrderAsc(parent.getId()))
                .thenReturn(List.of(s1, s2));

        List<ChapterResponse> result = sectionService.findSectionsByChapter(parent.getId(), user.getEmail());

        assertThat(result).hasSize(2);
        assertThat(result.get(0).sectionOrder()).isEqualTo(1);
        assertThat(result.get(1).sectionOrder()).isEqualTo(2);
    }

    @Test
    void findSectionsByChapter_shouldThrow_whenChapterNotFound() {
        UUID unknownId = UUID.randomUUID();
        when(chapterRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> sectionService.findSectionsByChapter(unknownId, "user@email.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void findSectionsByChapter_shouldThrow_whenUserIsNotOwner() {
        User owner = buildUser("dono@email.com");
        User intruder = buildUser("intruso@email.com");
        Project project = buildProject(owner);
        Chapter parent = buildChapter(project);

        when(chapterRepository.findById(parent.getId())).thenReturn(Optional.of(parent));

        assertThatThrownBy(() -> sectionService.findSectionsByChapter(parent.getId(), intruder.getEmail()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void updateSection_shouldUpdateTitleAndSectionOrder() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter parent = buildChapter(project);
        Chapter section = buildSection(project, parent);
        UpdateSectionRequest request = new UpdateSectionRequest("Novo título", null, 3);

        when(chapterRepository.findById(section.getId())).thenReturn(Optional.of(section));
        when(chapterRepository.save(any(Chapter.class))).thenAnswer(inv -> inv.getArgument(0));

        ChapterResponse response = sectionService.updateSection(section.getId(), request, user.getEmail());

        assertThat(response.title()).isEqualTo("Novo título");
        assertThat(response.sectionOrder()).isEqualTo(3);
    }

    @Test
    void updateSection_shouldUpdateContentAndWordCount() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter parent = buildChapter(project);
        Chapter section = buildSection(project, parent);
        UpdateSectionRequest request = new UpdateSectionRequest(null, "Esta seção tem cinco palavras.", null);

        when(chapterRepository.findById(section.getId())).thenReturn(Optional.of(section));
        when(chapterRepository.save(any(Chapter.class))).thenAnswer(inv -> inv.getArgument(0));

        ChapterResponse response = sectionService.updateSection(section.getId(), request, user.getEmail());

        assertThat(response.wordCount()).isEqualTo(5);
        assertThat(response.status()).isEqualTo(ChapterStatus.WRITING.name());
    }

    @Test
    void updateSection_shouldThrow_whenNotSection() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project); // level=1, parent=null

        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        assertThatThrownBy(() -> sectionService.updateSection(chapter.getId(),
                new UpdateSectionRequest("Título", null, null), user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Seção não encontrada");
    }

    @Test
    void updateSection_shouldThrow_whenUserIsNotOwner() {
        User owner = buildUser("dono@email.com");
        User intruder = buildUser("intruso@email.com");
        Project project = buildProject(owner);
        Chapter parent = buildChapter(project);
        Chapter section = buildSection(project, parent);

        when(chapterRepository.findById(section.getId())).thenReturn(Optional.of(section));

        assertThatThrownBy(() -> sectionService.updateSection(section.getId(),
                new UpdateSectionRequest("Título", null, null), intruder.getEmail()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void deleteSection_shouldRemoveSection() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter parent = buildChapter(project);
        Chapter section = buildSection(project, parent);

        when(chapterRepository.findById(section.getId())).thenReturn(Optional.of(section));

        sectionService.deleteSection(section.getId(), user.getEmail());

        verify(chapterRepository).delete(section);
    }

    @Test
    void deleteSection_shouldThrow_whenNotSection() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project); // level=1, parent=null

        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        assertThatThrownBy(() -> sectionService.deleteSection(chapter.getId(), user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Seção não encontrada");
    }

    @Test
    void deleteSection_shouldThrow_whenUserIsNotOwner() {
        User owner = buildUser("dono@email.com");
        User intruder = buildUser("intruso@email.com");
        Project project = buildProject(owner);
        Chapter parent = buildChapter(project);
        Chapter section = buildSection(project, parent);

        when(chapterRepository.findById(section.getId())).thenReturn(Optional.of(section));

        assertThatThrownBy(() -> sectionService.deleteSection(section.getId(), intruder.getEmail()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void createSection_shouldThrow_whenProjectIsDeleted() {
        User user = buildUser("aluno@email.com");
        Project deleted = buildDeletedProject(user);
        Chapter parent = buildChapter(deleted);

        when(chapterRepository.findById(parent.getId())).thenReturn(Optional.of(parent));

        assertThatThrownBy(() -> sectionService.createSection(parent.getId(),
                new CreateSectionRequest("Título", 1), user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }
}
