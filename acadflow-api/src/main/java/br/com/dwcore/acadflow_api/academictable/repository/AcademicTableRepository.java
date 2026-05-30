package br.com.dwcore.acadflow_api.academictable.repository;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicTableRepository extends JpaRepository<AcademicTable, UUID> {

    List<AcademicTable> findByProjectIdOrderByCreatedAtAsc(UUID projectId);

    List<AcademicTable> findByChapterIdOrderByCreatedAtAsc(UUID chapterId);

    @Query("SELECT t FROM AcademicTable t WHERE t.id = :id AND t.project.user.id = :userId AND t.project.deletedAt IS NULL")
    Optional<AcademicTable> findByIdAndProjectUserId(@Param("id") UUID id, @Param("userId") UUID userId);
}
