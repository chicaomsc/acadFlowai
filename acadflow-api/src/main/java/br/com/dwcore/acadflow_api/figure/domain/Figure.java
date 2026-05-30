package br.com.dwcore.acadflow_api.figure.domain;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.project.domain.Project;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "figures")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Figure {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id", nullable = false)
    private Chapter chapter;

    @Column(nullable = false)
    private String caption;

    @Column(name = "source_text")
    private String sourceText;

    @Column(name = "storage_key", nullable = false)
    private String storageKey;

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(name = "mime_type", nullable = false)
    private String mimeType;

    @Column(name = "file_size_bytes", nullable = false)
    private Long fileSizeBytes;

    @Column(name = "width_percent", nullable = false)
    @Builder.Default
    private Integer widthPercent = 100;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
