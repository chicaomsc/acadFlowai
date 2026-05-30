package br.com.dwcore.acadflow_api.figure.service;

import java.io.IOException;
import java.util.UUID;

public interface FigureStorageService {
    /**
     * Stores image bytes and returns the storage key (relative path key).
     */
    String store(UUID projectId, UUID figureId, String extension, byte[] data) throws IOException;

    byte[] load(String storageKey) throws IOException;

    boolean exists(String storageKey);

    /**
     * Deletes the file. Must not throw if file does not exist.
     */
    void delete(String storageKey);
}
