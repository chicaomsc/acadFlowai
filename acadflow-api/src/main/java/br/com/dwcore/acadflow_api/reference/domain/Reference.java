package br.com.dwcore.acadflow_api.reference.domain;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.project.domain.Project;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "academic_references")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_chapter_id")
    private Chapter primaryChapter;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String authors;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReferenceType type;

    @Column(nullable = false)
    private Integer year;

    private String journal;

    private String publisher;

    private String doi;

    @Column(columnDefinition = "TEXT")
    private String url;

    private LocalDate accessDate;

    @Column(columnDefinition = "TEXT")
    private String abntFormatted;

    @Column(nullable = false)
    private boolean hasCitation;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
