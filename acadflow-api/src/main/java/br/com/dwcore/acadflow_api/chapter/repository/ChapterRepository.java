package br.com.dwcore.acadflow_api.chapter.repository;

import br.com.dwcore.acadflow_api.chapter.domain.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChapterRepository extends JpaRepository<Chapter, UUID> {

    List<Chapter> findByProjectIdOrderByOrderIndexAsc(UUID projectId);

    List<Chapter> findByProjectIdAndParentIsNullOrderByOrderIndexAsc(UUID projectId);

    List<Chapter> findByParentIdOrderBySectionOrderAsc(UUID parentId);
}
