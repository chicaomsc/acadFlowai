package br.com.dwcore.acadflow_api.figure.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Slf4j
@Service
public class LocalFigureStorageService implements FigureStorageService {

    @Value("${app.figures.dir}")
    private String figuresDir;

    private Path baseDir;

    @PostConstruct
    void init() {
        baseDir = Paths.get(figuresDir).toAbsolutePath().normalize();
        log.info("Figures directory: {}", baseDir);
        Path tmp = Paths.get(System.getProperty("java.io.tmpdir")).toAbsolutePath().normalize();
        if (baseDir.startsWith(tmp)) {
            log.warn("app.figures.dir is under the system tmp directory ({}). " +
                     "Files may be removed by the OS. Configure FIGURES_DIR for a persistent path in production.", baseDir);
        }
    }

    @Override
    public String store(UUID projectId, UUID figureId, String extension, byte[] data) throws IOException {
        String key = projectId.toString() + "/" + figureId.toString() + "." + extension;
        Path dir = baseDir.resolve(projectId.toString());
        Files.createDirectories(dir);
        Files.write(dir.resolve(figureId.toString() + "." + extension), data);
        return key;
    }

    @Override
    public byte[] load(String storageKey) throws IOException {
        return Files.readAllBytes(resolveSecure(storageKey));
    }

    @Override
    public boolean exists(String storageKey) {
        return Files.exists(resolveSecure(storageKey));
    }

    @Override
    public void delete(String storageKey) {
        try {
            Files.deleteIfExists(resolveSecure(storageKey));
        } catch (IllegalArgumentException e) {
            log.warn("Rejected attempt to delete outside figures directory: {}", storageKey);
            throw e;
        } catch (IOException e) {
            log.warn("Failed to delete figure file at key {}: {}", storageKey, e.getMessage());
        }
    }

    private Path resolveSecure(String storageKey) {
        Path resolved = baseDir.resolve(storageKey).normalize();
        if (!resolved.startsWith(baseDir)) {
            throw new IllegalArgumentException("Acesso negado: storageKey inválido");
        }
        return resolved;
    }
}
