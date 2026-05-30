package br.com.dwcore.acadflow_api.figure;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterStatus;
import br.com.dwcore.acadflow_api.chapter.domain.ChapterType;
import br.com.dwcore.acadflow_api.chapter.repository.ChapterRepository;
import br.com.dwcore.acadflow_api.figure.domain.Figure;
import br.com.dwcore.acadflow_api.figure.dto.FigureResponse;
import br.com.dwcore.acadflow_api.figure.repository.FigureRepository;
import br.com.dwcore.acadflow_api.figure.service.FigureService;
import br.com.dwcore.acadflow_api.figure.service.FigureStorageService;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FigureServiceTest {

    @Mock private FigureRepository figureRepository;
    @Mock private FigureStorageService figureStorageService;
    @Mock private ProjectRepository projectRepository;
    @Mock private ChapterRepository chapterRepository;
    @Mock private UserService userService;

    @InjectMocks
    private FigureService figureService;

    @BeforeEach
    void setMaxSizeMb() {
        ReflectionTestUtils.setField(figureService, "maxSizeMb", 10);
    }

    private static final byte[] PNG_BYTES = {
        (byte)0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    };

    private static final byte[] JPEG_BYTES = {
        (byte)0xFF, (byte)0xD8, (byte)0xFF, (byte)0xE0,
        0x00, 0x00, 0x00, 0x00
    };

    private static final byte[] GIF_BYTES = {
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
        0x00, 0x00
    };

    private User buildUser() {
        return User.builder().id(UUID.randomUUID()).name("Aluno").email("aluno@email.com")
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

    private Figure buildFigure(Project project, Chapter chapter) {
        return Figure.builder()
                .id(UUID.randomUUID())
                .project(project)
                .chapter(chapter)
                .caption("Minha figura")
                .storageKey("proj/fig.png")
                .mimeType("image/png")
                .fileSizeBytes((long) PNG_BYTES.length)
                .widthPercent(100)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void shouldCreatePngFigure() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Figure savedFigure = buildFigure(project, chapter);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(figureStorageService.store(any(), any(), eq("png"), any())).thenReturn("key/fig.png");
        when(figureRepository.save(any())).thenReturn(savedFigure);

        MockMultipartFile file = new MockMultipartFile("file", "image.png", "image/png", PNG_BYTES);
        FigureResponse response = figureService.create(
                project.getId(), chapter.getId(), file, "Legenda da figura", null, null, user.getEmail());

        assertThat(response).isNotNull();
        assertThat(response.mimeType()).isEqualTo("image/png");
        verify(figureStorageService).store(any(), any(), eq("png"), any());
        verify(figureRepository).save(any());
    }

    @Test
    void shouldCreateJpegFigure() throws Exception {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Figure savedFigure = Figure.builder()
                .id(UUID.randomUUID()).project(project).chapter(chapter)
                .caption("Foto").storageKey("key/fig.jpg")
                .mimeType("image/jpeg").fileSizeBytes((long) JPEG_BYTES.length)
                .widthPercent(100).createdAt(LocalDateTime.now()).build();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(figureStorageService.store(any(), any(), eq("jpg"), any())).thenReturn("key/fig.jpg");
        when(figureRepository.save(any())).thenReturn(savedFigure);

        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", JPEG_BYTES);
        FigureResponse response = figureService.create(
                project.getId(), chapter.getId(), file, "Foto", null, null, user.getEmail());

        assertThat(response.mimeType()).isEqualTo("image/jpeg");
        verify(figureStorageService).store(any(), any(), eq("jpg"), any());
    }

    @Test
    void shouldRejectInvalidMimeType() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        MockMultipartFile file = new MockMultipartFile("file", "image.gif", "image/gif", GIF_BYTES);
        assertThatThrownBy(() -> figureService.create(
                project.getId(), chapter.getId(), file, "Legenda", null, null, user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Formato não suportado");
    }

    @Test
    void shouldRejectFileTooLarge() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);

        ReflectionTestUtils.setField(figureService, "maxSizeMb", 1);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        // 2MB file — exceeds 1MB limit
        byte[] bigFile = new byte[2 * 1024 * 1024];
        bigFile[0] = (byte) 0x89;
        bigFile[1] = 0x50;
        MockMultipartFile file = new MockMultipartFile("file", "big.png", "image/png", bigFile);

        assertThatThrownBy(() -> figureService.create(
                project.getId(), chapter.getId(), file, "Legenda", null, null, user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("excede o tamanho máximo");
    }

    @Test
    void shouldRejectEmptyCaption() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        MockMultipartFile file = new MockMultipartFile("file", "image.png", "image/png", PNG_BYTES);
        assertThatThrownBy(() -> figureService.create(
                project.getId(), chapter.getId(), file, "  ", null, null, user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Legenda é obrigatória");
    }

    @Test
    void shouldRejectWidthPercentBelow30() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        MockMultipartFile file = new MockMultipartFile("file", "image.png", "image/png", PNG_BYTES);
        assertThatThrownBy(() -> figureService.create(
                project.getId(), chapter.getId(), file, "Legenda", null, 29, user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("entre 30 e 100");
    }

    @Test
    void shouldRejectWidthPercentAbove100() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));

        MockMultipartFile file = new MockMultipartFile("file", "image.png", "image/png", PNG_BYTES);
        assertThatThrownBy(() -> figureService.create(
                project.getId(), chapter.getId(), file, "Legenda", null, 101, user.getEmail()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("entre 30 e 100");
    }

    @Test
    void shouldListFiguresByProject() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Figure fig1 = buildFigure(project, chapter);
        Figure fig2 = buildFigure(project, chapter);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(figureRepository.findByProjectIdOrderByCreatedAtAsc(project.getId()))
                .thenReturn(List.of(fig1, fig2));

        List<FigureResponse> result = figureService.findByProject(project.getId(), user.getEmail());

        assertThat(result).hasSize(2);
    }

    @Test
    void shouldListFiguresByChapter() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Figure fig = buildFigure(project, chapter);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.of(project));
        when(figureRepository.findByChapterIdOrderByCreatedAtAsc(chapter.getId()))
                .thenReturn(List.of(fig));

        List<FigureResponse> result = figureService.findByChapter(chapter.getId(), user.getEmail());

        assertThat(result).hasSize(1);
        assertThat(result.get(0).caption()).isEqualTo("Minha figura");
    }

    @Test
    void shouldReturn404ForSoftDeletedProject() {
        User user = buildUser();
        UUID projectId = UUID.randomUUID();

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(projectRepository.findByIdAndUserId(projectId, user.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> figureService.findByProject(projectId, user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Projeto não encontrado");
    }

    @Test
    void shouldDeleteFigureAndCallStorageDelete() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);
        Figure figure = buildFigure(project, chapter);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(figureRepository.findByIdAndProjectUserId(figure.getId(), user.getId()))
                .thenReturn(Optional.of(figure));

        figureService.delete(figure.getId(), user.getEmail());

        verify(figureRepository).delete(figure);
        verify(figureStorageService).delete("proj/fig.png");
    }

    @Test
    void shouldDenyAccessForOtherUsersFigure() {
        User intruder = buildUser();
        UUID figureId = UUID.randomUUID();

        when(userService.findEntityByEmail(intruder.getEmail())).thenReturn(intruder);
        when(figureRepository.findByIdAndProjectUserId(figureId, intruder.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> figureService.delete(figureId, intruder.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Figura não encontrada");
    }

    @Test
    void shouldListCitationByChapterReturn404ForSoftDeletedProject() {
        User user = buildUser();
        Project project = buildProject(user);
        Chapter chapter = buildChapter(project);

        when(userService.findEntityByEmail(user.getEmail())).thenReturn(user);
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
        when(projectRepository.findByIdAndUserId(project.getId(), user.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> figureService.findByChapter(chapter.getId(), user.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Capítulo não encontrado");
    }
}
