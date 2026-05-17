package br.com.dwcore.acadflow_api.project.repository;

import br.com.dwcore.acadflow_api.project.domain.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    @Query("SELECT p FROM Project p WHERE p.user.id = :userId AND p.deletedAt IS NULL ORDER BY p.createdAt DESC")
    List<Project> findByUserIdOrderByCreatedAtDesc(@Param("userId") UUID userId);

    @Query("SELECT p FROM Project p WHERE p.id = :id AND p.user.id = :userId AND p.deletedAt IS NULL")
    Optional<Project> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("SELECT p FROM Project p WHERE p.user.id = :userId AND p.deletedAt IS NOT NULL ORDER BY p.deletedAt DESC")
    List<Project> findDeletedByUserId(@Param("userId") UUID userId);
}
