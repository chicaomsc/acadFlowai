package br.com.dwcore.acadflow_api.project.domain;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import br.com.dwcore.acadflow_api.user.domain.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    private String subtitle;

    @Column(nullable = false)
    private String course;

    @Column(nullable = false)
    private String institution;

    private String advisorName;

    @Enumerated(EnumType.STRING)
    private AcademicDegree academicDegree;

    private String defenseCity;

    private Integer defenseYear;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AcademicNorm norm;

    private LocalDate deadline;

    @Column(columnDefinition = "TEXT")
    private String theme;

    @Column(columnDefinition = "TEXT")
    private String researchProblem;

    @Column(columnDefinition = "TEXT")
    private String generalObjective;

    @Column(columnDefinition = "TEXT")
    private String specificObjectives;

    @Column(columnDefinition = "TEXT")
    private String abstractPt;

    @Column(columnDefinition = "TEXT")
    private String abstractEn;

    private String keywords;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectStatus status;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<Chapter> chapters = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    private LocalDateTime deletedAt;
}
