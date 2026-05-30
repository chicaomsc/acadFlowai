package br.com.dwcore.acadflow_api.academictable.domain;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.project.domain.Project;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "academic_tables")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AcademicTable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id", nullable = false)
    private Chapter chapter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AcademicTableType type;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(name = "source_text", length = 500)
    private String sourceText;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
