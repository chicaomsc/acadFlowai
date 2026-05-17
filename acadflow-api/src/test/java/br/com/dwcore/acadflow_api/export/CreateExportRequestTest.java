package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.export.dto.CreateExportRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CreateExportRequestTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @ParameterizedTest
    @ValueSource(strings = {"docx", "pdf", "slides", "DOCX", "PDF", "SLIDES", "Docx"})
    void shouldAcceptValidFormats(String format) {
        CreateExportRequest request = new CreateExportRequest(UUID.randomUUID(), format);
        Set<ConstraintViolation<CreateExportRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"xlsx", "pptx", "txt", "csv", "odt", "html", ""})
    void shouldRejectInvalidFormat(String format) {
        UUID id = UUID.randomUUID();
        CreateExportRequest request = new CreateExportRequest(id, format.isEmpty() ? null : format);
        Set<ConstraintViolation<CreateExportRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        boolean hasFormatMessage = violations.stream()
                .anyMatch(v -> v.getMessage().contains("Formato") || v.getMessage().contains("obrigatório"));
        assertThat(hasFormatMessage).isTrue();
    }

    @Test
    void shouldRejectNullProjectId() {
        CreateExportRequest request = new CreateExportRequest(null, "docx");
        Set<ConstraintViolation<CreateExportRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations.stream().anyMatch(v -> v.getMessage().contains("Projeto"))).isTrue();
    }
}
