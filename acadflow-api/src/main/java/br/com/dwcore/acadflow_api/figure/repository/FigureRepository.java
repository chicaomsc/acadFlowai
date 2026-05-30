package br.com.dwcore.acadflow_api.figure.repository;

import br.com.dwcore.acadflow_api.figure.domain.Figure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FigureRepository extends JpaRepository<Figure, UUID> {
    List<Figure> findByProjectIdOrderByCreatedAtAsc(UUID projectId);
    List<Figure> findByChapterIdOrderByCreatedAtAsc(UUID chapterId);

    @Query("SELECT f FROM Figure f WHERE f.id = :figureId AND f.project.user.id = :userId AND f.project.deletedAt IS NULL")
    Optional<Figure> findByIdAndProjectUserId(@Param("figureId") UUID figureId, @Param("userId") UUID userId);
}
