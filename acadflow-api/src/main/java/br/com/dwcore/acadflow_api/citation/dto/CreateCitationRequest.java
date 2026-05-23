package br.com.dwcore.acadflow_api.citation.dto;

import br.com.dwcore.acadflow_api.citation.domain.CitationDisplayMode;
import br.com.dwcore.acadflow_api.citation.domain.CitationType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateCitationRequest(
        @NotNull(message = "Tipo de citação é obrigatório") CitationType type,
        @NotNull(message = "Referência é obrigatória") UUID referenceId,
        CitationDisplayMode displayMode,
        @Size(max = 30) String pageNumber,
        @Size(max = 255) String apudAuthor,
        @Size(max = 10) String apudYear,
        String quotedText
) {}
