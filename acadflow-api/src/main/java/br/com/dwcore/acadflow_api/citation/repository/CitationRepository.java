package br.com.dwcore.acadflow_api.citation.repository;

import br.com.dwcore.acadflow_api.citation.domain.Citation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CitationRepository extends JpaRepository<Citation, UUID> {

    List<Citation> findByChapterIdOrderByCreatedAtAsc(UUID chapterId);

    List<Citation> findByProjectId(UUID projectId);

    long countByReferenceId(UUID referenceId);
}
