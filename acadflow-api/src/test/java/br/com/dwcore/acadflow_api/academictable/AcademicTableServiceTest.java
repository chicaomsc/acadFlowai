package br.com.dwcore.acadflow_api.academictable;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTable;
import br.com.dwcore.acadflow_api.academictable.domain.AcademicTableType;
import br.com.dwcore.acadflow_api.academictable.dto.AcademicTableResponse;
import br.com.dwcore.acadflow_api.academictable.dto.CreateAcademicTableRequest;
import br.com.dwcore.acadflow_api.academictable.dto.UpdateAcademicTableRequest;
import br.com.dwcore.acadflow_api.academictable.repository.AcademicTableRepository;
import br.com.dwcore.acadflow_api.academictable.service.AcademicTableService;
import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.project.domain.AcademicDegree;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.shared.exception.BusinessException;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AcademicTableServiceTest {

    @Mock private AcademicTableRepository tableRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ChapterRepository chapterRepository;
    @Mock private UserService userService;

    @InjectMocks
    private AcademicTableService tableService;

    // ── Builders ─────────────────────────────────────────────────────────────

    private User buildUser() {
        return User.builder().id(UUID.randomUUID()).name("Aluno").email("aluno@email.com")
                .password("hash").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private Project buildProject(User owner) {
        return Project.builder().id(UUID.randomUUID()).user(owner)
                .title("Projeto Teste").course("CC").institution("UFBA")
                .norm(AcademicNorm.ABNT).academicDegree(AcademicDegree.GRADUACAO)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();
    }

    private Chapter buildChapter(Project project) {
        return Chapter.builder().id(UUID.randomUUID()).project(project)
                .title("Introdução").type(ChapterType.INTRODUCTION)
                .status(ChapterStatus.WRITING).orderIndex(1)
                .wordCount(0).targetWordCount(2000).build();
    }

    private AcademicTable buildTable(Project project, Chapter chapter) {
        return AcademicTable.builder()
                .id(UUID.randomUUID()).project(project).chapter(chapter)
                .type(AcademicTableType.TABLE).title("Distribuição por faixa etária")
                .content("| Faixa | N |\n|---|---|\n| 18-24 | 10 |")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
    }

    private AcademicTable buildQuadro(Project project, Chapter chapter) {
        return AcademicTable.builder()
                .id(UUID.randomUUID()).project(project).chapter(chapter)
                .type(AcademicTableType.QUADRO).title("Cronograma de atividades")
                .content("| Atividade | Mês |\n|---|---|\n| Pesquisa | Jan |")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
    }

    private static final String CONTENT = "| Col A | Col B |\n|---|---|\n| v1 | v2 |";

    // ── Create — TABLE ────────────────────────────────────────────────────────

    @Test
    void shouldCreateTable() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        AcademicTable saved = buildTable(project, chapter);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(tableRepository.save(any())).thenReturn(saved);

        CreateAcademicTableRequest request = new CreateAcademicTableRequest(
                chapter.getId(), AcademicTableType.TABLE, "Distribuição por faixa etária", null, CONTENT);

        AcademicTableResponse response = tableService.create(project.getId(), request, user.getEmail());

        assertThat(response.type()).isEqualTo(AcademicTableType.TABLE);
        assertThat(response.title()).isEqualTo("Distribuição por faixa etária");
        assertThat(response.projectId()).isEqualTo(project.getId());
        assertThat(response.chapterId()).isEqualTo(chapter.getId());
        verify(tableRepository).save(any(AcademicTable.class));
    }

    @Test
    void shouldCreateQuadro() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        AcademicTable saved = buildQuadro(project, chapter);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(tableRepository.save(any())).thenReturn(saved);

        CreateAcademicTableRequest request = new CreateAcademicTableRequest(
                chapter.getId(), AcademicTableType.QUADRO, "Cronograma de atividades", "Autor, 2024", CONTENT);

        AcademicTableResponse response = tableService.create(project.getId(), request, user.getEmail());

        assertThat(response.type()).isEqualTo(AcademicTableType.QUADRO);
        assertThat(response.title()).isEqualTo("Cronograma de atividades");
    }

    @Test
    void shouldPersistSourceText() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        AcademicTable saved = AcademicTable.builder()
                .id(UUID.randomUUID()).project(project).chapter(chapter)
                .type(AcademicTableType.TABLE).title("Título")
                .sourceText("IBGE, 2023").content(CONTENT)
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(tableRepository.save(any())).thenReturn(saved);

        CreateAcademicTableRequest request = new CreateAcademicTableRequest(
                chapter.getId(), AcademicTableType.TABLE, "Título", "IBGE, 2023", CONTENT);

        AcademicTableResponse response = tableService.create(project.getId(), request, user.getEmail());

        assertThat(response.sourceText()).isEqualTo("IBGE, 2023");
    }

    // ── List ─────────────────────────────────────────────────────────────────

    @Test
    void shouldListTablesByProject() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(tableRepository.findByProjectIdOrderByCreatedAtAsc(project.getId()))
                .thenReturn(List.of(buildTable(project, chapter), buildQuadro(project, chapter)));

        List<AcademicTableResponse> result = tableService.findByProject(project.getId(), user.getEmail());

        assertThat(result).hasSize(2);
        assertThat(result).extracting(AcademicTableResponse::type)
                .containsExactly(AcademicTableType.TABLE, AcademicTableType.QUADRO);
    }

    @Test
    void shouldListTablesByChapter() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(tableRepository.findByChapterIdOrderByCreatedAtAsc(chapter.getId()))
                .thenReturn(List.of(buildTable(project, chapter)));

        List<AcademicTableResponse> result = tableService.findByChapter(chapter.getId(), user.getEmail());

        assertThat(result).hasSize(1);
        assertThat(result.get(0).type()).isEqualTo(AcademicTableType.TABLE);
    }

    @Test
    void shouldReturnEmptyListWhenProjectHasNoTables() {
        User user = buildUser();
        Project project = buildProject(user);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(tableRepository.findByProjectIdOrderByCreatedAtAsc(project.getId()))
                .thenReturn(List.of());

        List<AcademicTableResponse> result = tableService.findByProject(project.getId(), user.getEmail());

        assertThat(result).isEmpty();
    }

    // ── Update ────────────────────────────────────────────────────────────────

    @Test
    void shouldUpdateTitle() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        AcademicTable table = buildTable(project, chapter);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(tableRepository.findByIdAndProjectUserId(table.getId(), user.getId()))
                .thenReturn(Optional.of(table));
        when(tableRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateAcademicTableRequest request = new UpdateAcademicTableRequest(null, "Novo Título", null, null);
        AcademicTableResponse response = tableService.update(table.getId(), request, user.getEmail());

        assertThat(response.title()).isEqualTo("Novo Título");
        assertThat(response.type()).isEqualTo(AcademicTableType.TABLE);
    }

    @Test
    void shouldUpdateTypeFromTableToQuadro() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        AcademicTable table = buildTable(project, chapter);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(tableRepository.findByIdAndProjectUserId(table.getId(), user.getId()))
                .thenReturn(Optional.of(table));
        when(tableRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateAcademicTableRequest request = new UpdateAcademicTableRequest(AcademicTableType.QUADRO, null, null, null);
        AcademicTableResponse response = tableService.update(table.getId(), request, user.getEmail());

        assertThat(response.type()).isEqualTo(AcademicTableType.QUADRO);
    }

    @Test
    void shouldClearSourceTextWhenBlankStringPassedOnUpdate() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        AcademicTable table = buildTable(project, chapter);
        table.setSourceText("Fonte antiga");

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(tableRepository.findByIdAndProjectUserId(table.getId(), user.getId()))
                .thenReturn(Optional.of(table));
        when(tableRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateAcademicTableRequest request = new UpdateAcademicTableRequest(null, null, "  ", null);
        AcademicTableResponse response = tableService.update(table.getId(), request, user.getEmail());

        assertThat(response.sourceText()).isNull();
    }

    @Test
    void shouldUpdateContent() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        AcademicTable table = buildTable(project, chapter);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(tableRepository.findByIdAndProjectUserId(table.getId(), user.getId()))
                .thenReturn(Optional.of(table));
        when(tableRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String newContent = "| A | B |\n|---|---|\n| x | y |";
        UpdateAcademicTableRequest request = new UpdateAcademicTableRequest(null, null, null, newContent);
        AcademicTableResponse response = tableService.update(table.getId(), request, user.getEmail());

        assertThat(response.content()).isEqualTo(newContent);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    @Test
    void shouldDeleteTable() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        AcademicTable table = buildTable(project, chapter);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(tableRepository.findByIdAndProjectUserId(table.getId(), user.getId()))
                .thenReturn(Optional.of(table));

        tableService.delete(table.getId(), user.getEmail());

        verify(tableRepository).delete(table);
    }

    // ── Ownership & Soft-delete ───────────────────────────────────────────────

    @Test
    void shouldReturn404ForOtherUserOnCreate() {
        User owner = buildUser();
        User other = buildUser();
        Project project = buildProject(owner);

        when(userService.findEntityByEmail(other.getEmail())).thenReturn(other);
        when(projectRepository.findByIdAndUserId(project.getId(), other.getId()))
                .thenReturn(Optional.empty());

        CreateAcademicTableRequest request = new CreateAcademicTableRequest(
                UUID.randomUUID(), AcademicTableType.TABLE, "Título", null, CONTENT);

        assertThatThrownBy(() -> tableService.create(project.getId(), request, other.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    @Test
    void shouldReturn404ForSoftDeletedProjectOnCreate() {
        User user = buildUser();
        Project deleted = buildProject(user);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        // findByIdAndUserId filters deletedAt IS NULL → returns empty for deleted project
        when(projectRepository.findByIdAndUserId(deleted.getId(), user.getId()))
                .thenReturn(Optional.empty());

        CreateAcademicTableRequest request = new CreateAcademicTableRequest(
                UUID.randomUUID(), AcademicTableType.TABLE, "Título", null, CONTENT);

        assertThatThrownBy(() -> tableService.create(deleted.getId(), request, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    @Test
    void shouldReturn404ForSoftDeletedProjectOnFindByProject() {
        User user = buildUser();
        Project deleted = buildProject(user);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        // findByIdAndUserId has AND p.deletedAt IS NULL → returns empty for soft-deleted project
        when(projectRepository.findByIdAndUserId(deleted.getId(), user.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> tableService.findByProject(deleted.getId(), user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    @Test
    void shouldReturn404ForSoftDeletedProjectOnListByChapter() {
        User user = buildUser();
        Project deletedProject = Project.builder().id(UUID.randomUUID()).user(user)
                .title("Deletado").course("CC").institution("UFBA")
                .norm(AcademicNorm.ABNT).status(ProjectStatus.IN_PROGRESS)
                .chapters(new ArrayList<>()).deletedAt(LocalDateTime.now()).build();
        Chapter chapter = buildChapter(deletedProject);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        assertThatThrownBy(() -> tableService.findByChapter(chapter.getId(), user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    @Test
    void shouldReturn404ForOtherUserOnListByChapter() {
        User owner = buildUser();
        User other = buildUser();
        Project project = buildProject(owner);
        Chapter chapter = buildChapter(project);

        when(userService.findEntityByEmail(other.getEmail())).thenReturn(other);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        assertThatThrownBy(() -> tableService.findByChapter(chapter.getId(), other.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Capítulo não encontrado");
    }

    @Test
    void shouldReturn404ForOtherUserOnUpdate() {
        User owner = buildUser();
        User other = buildUser();
        Project project = buildProject(owner);
        Chapter chapter = buildChapter(project);
        AcademicTable table = buildTable(project, chapter);

        when(userService.findEntityByEmail(other.getEmail())).thenReturn(other);
        when(tableRepository.findByIdAndProjectUserId(table.getId(), other.getId()))
                .thenReturn(Optional.empty());

        UpdateAcademicTableRequest request = new UpdateAcademicTableRequest(null, "Hack", null, null);

        assertThatThrownBy(() -> tableService.update(table.getId(), request, other.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Tabela não encontrada");
    }

    @Test
    void shouldReturn404ForOtherUserOnDelete() {
        User owner = buildUser();
        User other = buildUser();
        Project project = buildProject(owner);
        Chapter chapter = buildChapter(project);
        AcademicTable table = buildTable(project, chapter);

        when(userService.findEntityByEmail(other.getEmail())).thenReturn(other);
        when(tableRepository.findByIdAndProjectUserId(table.getId(), other.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> tableService.delete(table.getId(), other.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Tabela não encontrada");
    }

    // ── Chapter ownership ─────────────────────────────────────────────────────

    @Test
    void shouldThrowWhenChapterBelongsToDifferentProject() {
        User user = buildUser();
        Project project = buildProject(user);
        Project otherProject = buildProject(user);
        Chapter foreignChapter = buildChapter(otherProject);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(foreignChapter.getId())).thenReturn(Optional.of(foreignChapter));

        CreateAcademicTableRequest request = new CreateAcademicTableRequest(
                foreignChapter.getId(), AcademicTableType.TABLE, "Título", null, CONTENT);

        assertThatThrownBy(() -> tableService.create(project.getId(), request, user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Capítulo não pertence ao projeto");
    }

    @Test
    void shouldReturn404WhenChapterNotFound() {
        User user = buildUser();
        Project project = buildProject(user);
        UUID missingChapterId = UUID.randomUUID();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(missingChapterId)).thenReturn(Optional.empty());

        CreateAcademicTableRequest request = new CreateAcademicTableRequest(
                missingChapterId, AcademicTableType.TABLE, "Título", null, CONTENT);

        assertThatThrownBy(() -> tableService.create(project.getId(), request, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Capítulo não encontrado");
    }

    // ── Field validation ──────────────────────────────────────────────────────

    @Test
    void shouldThrowWhenTitleIsBlankOnCreate() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        CreateAcademicTableRequest request = new CreateAcademicTableRequest(
                chapter.getId(), AcademicTableType.TABLE, "   ", null, CONTENT);

        assertThatThrownBy(() -> tableService.create(project.getId(), request, user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("título não pode ser vazio");
    }

    @Test
    void shouldThrowWhenContentIsBlankOnCreate() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        CreateAcademicTableRequest request = new CreateAcademicTableRequest(
                chapter.getId(), AcademicTableType.TABLE, "Título", null, "   ");

        assertThatThrownBy(() -> tableService.create(project.getId(), request, user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("conteúdo não pode ser vazio");
    }

    @Test
    void shouldThrowWhenTitleIsBlankOnUpdate() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        AcademicTable table = buildTable(project, chapter);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(tableRepository.findByIdAndProjectUserId(table.getId(), user.getId()))
                .thenReturn(Optional.of(table));

        UpdateAcademicTableRequest request = new UpdateAcademicTableRequest(null, "   ", null, null);

        assertThatThrownBy(() -> tableService.update(table.getId(), request, user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("título não pode ser vazio");
    }

    @Test
    void shouldThrowWhenContentIsBlankOnUpdate() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        AcademicTable table = buildTable(project, chapter);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(tableRepository.findByIdAndProjectUserId(table.getId(), user.getId()))
                .thenReturn(Optional.of(table));

        UpdateAcademicTableRequest request = new UpdateAcademicTableRequest(null, null, null, "   ");

        assertThatThrownBy(() -> tableService.update(table.getId(), request, user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("conteúdo não pode ser vazio");
    }
}
