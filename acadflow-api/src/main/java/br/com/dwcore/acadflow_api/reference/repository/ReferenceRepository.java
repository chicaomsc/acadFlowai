package br.com.dwcore.acadflow_api.reference.repository;

import br.com.dwcore.acadflow_api.reference.domain.Reference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReferenceRepository extends JpaRepository<Reference, UUID> {

    List<Reference> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
}
