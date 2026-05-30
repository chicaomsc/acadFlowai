package br.com.dwcore.acadflow_api.figure;

import br.com.dwcore.acadflow_api.figure.service.LocalFigureStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalFigureStorageServiceTest {

    @TempDir
    Path tempDir;

    private LocalFigureStorageService service;

    @BeforeEach
    void setUp() {
        service = new LocalFigureStorageService();
        ReflectionTestUtils.setField(service, "figuresDir", tempDir.toString());
        ReflectionTestUtils.invokeMethod(service, "init");
    }

    // ── path traversal ────────────────────────────────────────────────────────

    @Test
    void loadRejectsPathTraversal() {
        assertThatThrownBy(() -> service.load("../sensitive/passwd"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("inválido");
    }

    @Test
    void existsRejectsPathTraversal() {
        assertThatThrownBy(() -> service.exists("../../etc/passwd"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("inválido");
    }

    @Test
    void deleteRejectsPathTraversal() {
        assertThatThrownBy(() -> service.delete("../outside/file.txt"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("inválido");
    }

    @Test
    void loadRejectsAbsolutePathKey() {
        assertThatThrownBy(() -> service.load("/etc/passwd"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void existsRejectsAbsolutePathKey() {
        assertThatThrownBy(() -> service.exists("/etc/passwd"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ── happy path ───────────────────────────────────────────────────────────

    @Test
    void loadWorksWithValidKey() throws IOException {
        UUID projectId = UUID.randomUUID();
        UUID figureId = UUID.randomUUID();
        byte[] data = {(byte) 0x89, 0x50, 0x4e, 0x47};

        String key = service.store(projectId, figureId, "png", data);
        byte[] loaded = service.load(key);

        assertThat(loaded).isEqualTo(data);
    }

    @Test
    void existsReturnsTrueForStoredFile() throws IOException {
        UUID projectId = UUID.randomUUID();
        UUID figureId = UUID.randomUUID();

        String key = service.store(projectId, figureId, "png", new byte[]{1, 2, 3});

        assertThat(service.exists(key)).isTrue();
    }

    @Test
    void existsReturnsFalseForMissingFile() {
        assertThat(service.exists("nonexistent/file.png")).isFalse();
    }

    @Test
    void deleteRemovesExistingFile() throws IOException {
        UUID projectId = UUID.randomUUID();
        UUID figureId = UUID.randomUUID();

        String key = service.store(projectId, figureId, "png", new byte[]{1, 2, 3});
        assertThat(service.exists(key)).isTrue();

        service.delete(key);
        assertThat(service.exists(key)).isFalse();
    }

    @Test
    void deleteDoesNotThrowForMissingFile() {
        service.delete("nonexistent/file.png"); // must not throw
    }
}
