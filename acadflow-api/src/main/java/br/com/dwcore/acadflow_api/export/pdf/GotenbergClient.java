package br.com.dwcore.acadflow_api.export.pdf;

import br.com.dwcore.acadflow_api.shared.exception.PdfConversionException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.time.Duration;

@Component
public class GotenbergClient {

    private static final String CONVERT_URI = "/forms/libreoffice/convert";

    private final RestClient restClient;

    public GotenbergClient(
            @Value("${app.gotenberg.url}") String gotenbergUrl,
            @Value("${app.gotenberg.timeout-seconds}") int timeoutSeconds) {

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(timeoutSeconds));
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        this.restClient = RestClient.builder()
                .baseUrl(gotenbergUrl)
                .requestFactory(factory)
                .build();
    }

    public byte[] toPdf(byte[] docxBytes, String filename) {
        String effectiveName = (filename != null && !filename.isBlank()) ? filename : "document.docx";

        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("files", new ByteArrayResource(docxBytes) {
            @Override
            public String getFilename() {
                return effectiveName;
            }
        });

        try {
            byte[] result = restClient.post()
                    .uri(CONVERT_URI)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(parts)
                    .retrieve()
                    .body(byte[].class);
            return result != null ? result : new byte[0];
        } catch (RestClientException e) {
            throw new PdfConversionException("Gotenberg conversion failed: " + e.getMessage(), e);
        }
    }
}
