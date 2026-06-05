package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.export.pdf.GotenbergClient;
import br.com.dwcore.acadflow_api.shared.exception.PdfConversionException;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import okhttp3.mockwebserver.SocketPolicy;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GotenbergClientTest {

    private MockWebServer server;
    private GotenbergClient client;

    @BeforeEach
    void setUp() throws IOException {
        server = new MockWebServer();
        server.start();
        client = new GotenbergClient("http://localhost:" + server.getPort(), 5);
    }

    @AfterEach
    void tearDown() throws IOException {
        server.shutdown();
    }

    @Test
    void toPdf_shouldReturnPdfBytesOnSuccess() throws Exception {
        byte[] fakePdf = "%PDF-fake".getBytes();
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .addHeader("Content-Type", "application/pdf")
                .setBody(new String(fakePdf)));

        byte[] result = client.toPdf("docx-content".getBytes(), "thesis.docx");

        assertThat(result).isNotEmpty();
        RecordedRequest request = server.takeRequest(1, TimeUnit.SECONDS);
        assertThat(request).isNotNull();
        assertThat(request.getPath()).isEqualTo("/forms/libreoffice/convert");
        assertThat(request.getHeader("Content-Type")).startsWith("multipart/form-data");
    }

    @Test
    void toPdf_shouldThrowPdfConversionExceptionOn503() {
        server.enqueue(new MockResponse().setResponseCode(503).setBody("Service Unavailable"));

        assertThatThrownBy(() -> client.toPdf("docx-content".getBytes(), "thesis.docx"))
                .isInstanceOf(PdfConversionException.class)
                .hasMessageContaining("Gotenberg conversion failed");
    }

    @Test
    void toPdf_shouldThrowPdfConversionExceptionOn500() {
        server.enqueue(new MockResponse().setResponseCode(500).setBody("Internal Server Error"));

        assertThatThrownBy(() -> client.toPdf("docx-content".getBytes(), "thesis.docx"))
                .isInstanceOf(PdfConversionException.class);
    }

    @Test
    void toPdf_shouldThrowPdfConversionExceptionOnTimeout() throws IOException {
        MockWebServer slowServer = new MockWebServer();
        slowServer.start();
        GotenbergClient shortTimeoutClient = new GotenbergClient(
                "http://localhost:" + slowServer.getPort(), 1);

        // Socket stays open but never sends a response — triggers read timeout
        slowServer.enqueue(new MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE));

        assertThatThrownBy(() -> shortTimeoutClient.toPdf("data".getBytes(), "test.docx"))
                .isInstanceOf(PdfConversionException.class);

        slowServer.shutdown();
    }

    @Test
    void toPdf_shouldIncludeFilenameInMultipartBody() throws Exception {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .addHeader("Content-Type", "application/pdf")
                .setBody("%PDF-fake"));

        client.toPdf("docx-content".getBytes(), "my-thesis.docx");

        RecordedRequest request = server.takeRequest(1, TimeUnit.SECONDS);
        assertThat(request).isNotNull();
        String body = request.getBody().readUtf8();
        assertThat(body).contains("my-thesis.docx");
    }

    @Test
    void toPdf_shouldUseDefaultFilenameWhenNullProvided() throws Exception {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .addHeader("Content-Type", "application/pdf")
                .setBody("%PDF-fake"));

        client.toPdf("docx-content".getBytes(), null);

        RecordedRequest request = server.takeRequest(1, TimeUnit.SECONDS);
        assertThat(request).isNotNull();
        String body = request.getBody().readUtf8();
        assertThat(body).contains("document.docx");
    }
}
