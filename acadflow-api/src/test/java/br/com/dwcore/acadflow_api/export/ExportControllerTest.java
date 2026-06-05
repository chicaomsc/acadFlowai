package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.export.controller.ExportController;
import br.com.dwcore.acadflow_api.export.dto.PdfExportResult;
import br.com.dwcore.acadflow_api.export.service.ExportService;
import br.com.dwcore.acadflow_api.shared.exception.BusinessException;
import br.com.dwcore.acadflow_api.shared.exception.GlobalExceptionHandler;
import br.com.dwcore.acadflow_api.shared.exception.PdfConversionException;
import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ExportControllerTest {

    @Mock
    private ExportService exportService;

    @InjectMocks
    private ExportController exportController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(exportController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();

        var user = User.withUsername("user@test.com").password("").roles("USER").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldReturnPdfBytesWithCorrectContentType() throws Exception {
        UUID projectId = UUID.randomUUID();
        byte[] pdfBytes = "%PDF-1.4 fake content".getBytes();
        when(exportService.createPdfExport(eq(projectId), anyString()))
                .thenReturn(new PdfExportResult(pdfBytes, "meu_tcc.pdf"));

        mockMvc.perform(get("/projects/{id}/export/pdf", projectId))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("attachment")))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("meu_tcc.pdf")))
                .andExpect(content().bytes(pdfBytes));
    }

    @Test
    void shouldReturn404WhenProjectNotFound() throws Exception {
        UUID projectId = UUID.randomUUID();
        when(exportService.createPdfExport(eq(projectId), anyString()))
                .thenThrow(new ResourceNotFoundException("Projeto não encontrado"));

        mockMvc.perform(get("/projects/{id}/export/pdf", projectId))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturn404WhenProjectBelongsToAnotherUser() throws Exception {
        UUID projectId = UUID.randomUUID();
        when(exportService.createPdfExport(eq(projectId), anyString()))
                .thenThrow(new ResourceNotFoundException("Projeto não encontrado"));

        mockMvc.perform(get("/projects/{id}/export/pdf", projectId))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturn400WhenProjectHasPendingItems() throws Exception {
        UUID projectId = UUID.randomUUID();
        when(exportService.createPdfExport(eq(projectId), anyString()))
                .thenThrow(new BusinessException("Projeto possui pendências que impedem a exportação"));

        mockMvc.perform(get("/projects/{id}/export/pdf", projectId))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn502WhenGotenbergFails() throws Exception {
        UUID projectId = UUID.randomUUID();
        when(exportService.createPdfExport(eq(projectId), anyString()))
                .thenThrow(new PdfConversionException("Gotenberg returned 503"));

        mockMvc.perform(get("/projects/{id}/export/pdf", projectId))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message").value("Falha ao converter documento para PDF."))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void shouldReturnEmptyBodyWhenPdfIsEmpty() throws Exception {
        UUID projectId = UUID.randomUUID();
        when(exportService.createPdfExport(eq(projectId), anyString()))
                .thenReturn(new PdfExportResult(new byte[0], "vazio.pdf"));

        mockMvc.perform(get("/projects/{id}/export/pdf", projectId))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE))
                .andExpect(content().bytes(new byte[0]));
    }
}
