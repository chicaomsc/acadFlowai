package br.com.dwcore.acadflow_api.shared;

import br.com.dwcore.acadflow_api.shared.exception.GlobalExceptionHandler;
import br.com.dwcore.acadflow_api.shared.response.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.NoHandlerFoundException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void shouldReturn404ForNoHandlerFound() {
        var ex = new NoHandlerFoundException("GET", "/unknown-path", new HttpHeaders());

        ResponseEntity<ApiResponse<Void>> response = handler.handleNoHandlerFound(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isFalse();
        assertThat(response.getBody().message()).isEqualTo("Recurso não encontrado");
    }

    @Test
    void shouldNotReturn500ForPathTraversalAttempt() {
        var ex = new NoHandlerFoundException("GET", "/exports/download/../../etc/passwd", new HttpHeaders());

        ResponseEntity<ApiResponse<Void>> response = handler.handleNoHandlerFound(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @Test
    void shouldNotReturn500ForUnknownRoute() {
        var ex = new NoHandlerFoundException("POST", "/nonexistent/endpoint", new HttpHeaders());

        ResponseEntity<ApiResponse<Void>> response = handler.handleNoHandlerFound(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isFalse();
    }
}
