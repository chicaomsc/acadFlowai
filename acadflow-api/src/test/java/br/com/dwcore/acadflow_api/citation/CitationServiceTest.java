package br.com.dwcore.acadflow_api.citation;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.citation.domain.CitationDisplayMode;
import br.com.dwcore.acadflow_api.citation.domain.CitationType;
import br.com.dwcore.acadflow_api.citation.dto.CitationResponse;
import br.com.dwcore.acadflow_api.citation.dto.CreateCitationRequest;
import br.com.dwcore.acadflow_api.citation.repository.CitationRepository;
import br.com.dwcore.acadflow_api.citation.service.CitationService;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.project.repository.ProjectRepository;
import br.com.dwcore.acadflow_api.reference.domain.Reference;
import br.com.dwcore.acadflow_api.reference.domain.ReferenceType;
import br.com.dwcore.acadflow_api.reference.repository.ReferenceRepository;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CitationServiceTest {

    @Mock private CitationRepository citationRepository;
    @Mock private ChapterRepository chapterRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ReferenceRepository referenceRepository;
    @Mock private UserService userService;

    @InjectMocks
    private CitationService citationService;

    private User buildUser(String email) {
        return User.builder().id(UUID.randomUUID()).name("Aluno").email(email)
                .password("hash").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private Project buildProject(User owner) {
        return Project.builder().id(UUID.randomUUID()).user(owner)
                .title("Projeto Teste").course("CC").institution("UFBA")
                .norm(AcademicNorm.ABNT).status(ProjectStatus.IN_PROGRESS)
                .chapters(new ArrayList<>()).build();
    }

    private Chapter buildChapter(Project project) {
        return Chapter.builder().id(UUID.randomUUID()).project(project)
                .title("Introdução").type(ChapterType.INTRODUCTION)
                .status(ChapterStatus.WRITING).orderIndex(1)
                .wordCount(0).targetWordCount(2000).build();
    }

    private Reference buildReference(Project project, boolean hasCitation) {
        return Reference.builder().id(UUID.randomUUID()).project(project)
                .title("Clean Code").authors("MARTIN, R. C.")
                .type(ReferenceType.BOOK).year(2008)
                .abntFormatted("MARTIN, R. C.. Clean Code. 2008.")
                .hasCitation(hasCitation).build();
    }

    private Citation buildCitation(Project project, Chapter chapter, Reference reference) {
        return Citation.builder().id(UUID.randomUUID())
                .project(project).chapter(chapter).reference(reference)
                .type(CitationType.INDIRECT).build();
    }

    private Citation buildCitation(Project project, Chapter chapter, Reference reference,
                                   CitationType type, CitationDisplayMode displayMode) {
        return Citation.builder().id(UUID.randomUUID())
                .project(project).chapter(chapter).reference(reference)
                .type(type).displayMode(displayMode).build();
    }

    @Test
    void shouldCreateIndirectCitation() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Reference reference = buildReference(project, false);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));
        Citation saved = buildCitation(project, chapter, reference);
        when(citationRepository.save(any())).thenReturn(saved);

        CreateCitationRequest request = new CreateCitationRequest(
                CitationType.INDIRECT, reference.getId(), null, null, null, null, null);
        CitationResponse response = citationService.create(chapter.getId(), request, user.getEmail());

        assertThat(response).isNotNull();
        assertThat(response.type()).isEqualTo("INDIRECT");
    }

    @Test
    void shouldCreateNarrativeCitation() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Reference reference = buildReference(project, false);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));
        Citation saved = buildCitation(project, chapter, reference, CitationType.INDIRECT, CitationDisplayMode.NARRATIVE);
        when(citationRepository.save(any())).thenReturn(saved);

        CreateCitationRequest request = new CreateCitationRequest(
                CitationType.INDIRECT, reference.getId(), CitationDisplayMode.NARRATIVE, null, null, null, null);
        CitationResponse response = citationService.create(chapter.getId(), request, user.getEmail());

        assertThat(response.displayMode()).isEqualTo("NARRATIVE");
    }

    @Test
    void shouldDefaultToParentheticalWhenDisplayModeIsNull() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Reference reference = buildReference(project, false);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));
        Citation saved = buildCitation(project, chapter, reference);
        when(citationRepository.save(any())).thenReturn(saved);

        CreateCitationRequest request = new CreateCitationRequest(
                CitationType.INDIRECT, reference.getId(), null, null, null, null, null);
        CitationResponse response = citationService.create(chapter.getId(), request, user.getEmail());

        assertThat(response.displayMode()).isEqualTo("PARENTHETICAL");
    }

    @Test
    void shouldSetHasCitationOnFirstCitation() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Reference reference = buildReference(project, false);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));
        when(citationRepository.save(any())).thenReturn(buildCitation(project, chapter, reference));

        CreateCitationRequest request = new CreateCitationRequest(
                CitationType.INDIRECT, reference.getId(), null, null, null, null, null);
        citationService.create(chapter.getId(), request, user.getEmail());

        verify(referenceRepository).save(reference);
        assertThat(reference.isHasCitation()).isTrue();
    }

    @Test
    void shouldNotSaveReferenceIfAlreadyHasCitation() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Reference reference = buildReference(project, true);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));
        when(citationRepository.save(any())).thenReturn(buildCitation(project, chapter, reference));

        CreateCitationRequest request = new CreateCitationRequest(
                CitationType.INDIRECT, reference.getId(), null, null, null, null, null);
        citationService.create(chapter.getId(), request, user.getEmail());

        verify(referenceRepository, never()).save(reference);
    }

    @Test
    void shouldClearHasCitationWhenLastCitationDeleted() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Reference reference = buildReference(project, true);
        Citation citation = buildCitation(project, chapter, reference);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(citationRepository.findById(citation.getId())).thenReturn(Optional.of(citation));
        when(citationRepository.countByReferenceId(reference.getId())).thenReturn(0L);
        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));

        citationService.delete(citation.getId(), user.getEmail());

        verify(referenceRepository).save(reference);
        assertThat(reference.isHasCitation()).isFalse();
    }

    @Test
    void shouldKeepHasCitationWhenOtherCitationsExist() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Reference reference = buildReference(project, true);
        Citation citation = buildCitation(project, chapter, reference);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(citationRepository.findById(citation.getId())).thenReturn(Optional.of(citation));
        when(citationRepository.countByReferenceId(reference.getId())).thenReturn(2L);

        citationService.delete(citation.getId(), user.getEmail());

        verify(referenceRepository, never()).save(any());
    }

    @Test
    void shouldThrowWhenChapterNotFound() {
        User user = buildUser("aluno@email.com");
        UUID chapterId = UUID.randomUUID();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.empty());

        CreateCitationRequest request = new CreateCitationRequest(
                CitationType.INDIRECT, UUID.randomUUID(), null, null, null, null, null);

        assertThatThrownBy(() -> citationService.create(chapterId, request, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Capítulo não encontrado");
    }

    @Test
    void shouldDenyCreateForOtherUsersChapter() {
        User intruder = buildUser("intruso@email.com");
        User owner = buildUser("dono@email.com");
        Project project = buildProject(owner);
        Chapter chapter = buildChapter(project);

        when(userService.findEntityByEmail(intruder.getEmail())).thenReturn(intruder);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        CreateCitationRequest request = new CreateCitationRequest(
                CitationType.INDIRECT, UUID.randomUUID(), null, null, null, null, null);

        assertThatThrownBy(() -> citationService.create(chapter.getId(), request, intruder.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void shouldThrowWhenReferenceNotFound() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        UUID missingRefId = UUID.randomUUID();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findById(missingRefId)).thenReturn(Optional.empty());

        CreateCitationRequest request = new CreateCitationRequest(
                CitationType.INDIRECT, missingRefId, null, null, null, null, null);

        assertThatThrownBy(() -> citationService.create(chapter.getId(), request, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Referência não encontrada");
    }

    @Test
    void shouldThrowWhenReferenceFromDifferentProject() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Project otherProject = buildProject(user);
        Chapter chapter = buildChapter(project);
        Reference foreignRef = buildReference(otherProject, false);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findById(foreignRef.getId())).thenReturn(Optional.of(foreignRef));

        CreateCitationRequest request = new CreateCitationRequest(
                CitationType.INDIRECT, foreignRef.getId(), null, null, null, null, null);

        assertThatThrownBy(() -> citationService.create(chapter.getId(), request, user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("mesmo projeto");
    }

    @Test
    void shouldRejectApudWithoutApudAuthor() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Reference reference = buildReference(project, false);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));

        CreateCitationRequest request = new CreateCitationRequest(
                CitationType.APUD, reference.getId(), null, null, null, "2010", null);

        assertThatThrownBy(() -> citationService.create(chapter.getId(), request, user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("apudAuthor");
    }

    @Test
    void shouldRejectDirectShortWithoutQuotedText() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Reference reference = buildReference(project, false);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(referenceRepository.findById(reference.getId())).thenReturn(Optional.of(reference));

        CreateCitationRequest request = new CreateCitationRequest(
                CitationType.DIRECT_SHORT, reference.getId(), null, "p. 10", null, null, null);

        assertThatThrownBy(() -> citationService.create(chapter.getId(), request, user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("quotedText");
    }

    @Test
    void shouldListCitationsByChapter() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Reference reference = buildReference(project, true);
        Citation citation = buildCitation(project, chapter, reference);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId())).thenReturn(Optional.of(project));
        when(citationRepository.findByChapterIdOrderByCreatedAtAsc(chapter.getId()))
                .thenReturn(List.of(citation));

        List<CitationResponse> result = citationService.findByChapterId(chapter.getId(), user.getEmail());

        assertThat(result).hasSize(1);
    }

    @Test
    void shouldListCitationsByProject() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Reference reference = buildReference(project, true);
        Citation citation = buildCitation(project, chapter, reference);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(citationRepository.findByProjectId(project.getId()))
                .thenReturn(List.of(citation));

        List<CitationResponse> result = citationService.findByProjectId(project.getId(), user.getEmail());

        assertThat(result).hasSize(1);
    }

    @Test
    void shouldReturn404WhenCreateCitationOnSoftDeletedProject() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Reference reference = buildReference(project, false);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.empty()); // project soft-deleted

        CreateCitationRequest request = new CreateCitationRequest(
                CitationType.INDIRECT, reference.getId(), null, null, null, null, null);

        assertThatThrownBy(() -> citationService.create(chapter.getId(), request, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Capítulo não encontrado");
    }

    @Test
    void shouldReturn404WhenListingCitationsOnSoftDeletedProject() {
        User user = buildUser("aluno@email.com");
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.empty()); // project soft-deleted

        assertThatThrownBy(() -> citationService.findByChapterId(chapter.getId(), user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Capítulo não encontrado");
    }

    @Test
    void shouldThrowWhenDeletingOtherUsersCitation() {
        User intruder = buildUser("intruso@email.com");
        User owner = buildUser("dono@email.com");
        Project project = buildProject(owner);
        Chapter chapter = buildChapter(project);
        Reference reference = buildReference(project, true);
        Citation citation = buildCitation(project, chapter, reference);

        when(userService.findEntityByEmail(intruder.getEmail())).thenReturn(intruder);
        when(citationRepository.findById(citation.getId())).thenReturn(Optional.of(citation));

        assertThatThrownBy(() -> citationService.delete(citation.getId(), intruder.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
