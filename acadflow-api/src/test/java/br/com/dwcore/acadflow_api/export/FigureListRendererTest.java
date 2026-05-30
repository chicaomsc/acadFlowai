package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.export.docx.dto.NumberedFigure;
import br.com.dwcore.acadflow_api.export.docx.renderer.FigureListRenderer;
import br.com.dwcore.acadflow_api.figure.domain.Figure;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class FigureListRendererTest {

    private final FigureListRenderer renderer = new FigureListRenderer();

    private static final byte[] MINIMAL_PNG = {
        (byte)0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, (byte)0x90, 0x77, 0x53, (byte)0xde,
        0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
        0x08, (byte)0xd7, 0x63, (byte)0xf8, (byte)0xcf, (byte)0xc0, 0x00, 0x00,
        0x00, 0x02, 0x00, 0x01, (byte)0xe2, 0x21, (byte)0xbc, 0x33,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
        (byte)0xae, 0x42, 0x60, (byte)0x82
    };

    private Figure buildFigure(String caption) {
        return Figure.builder()
                .id(UUID.randomUUID())
                .caption(caption)
                .mimeType("image/png")
                .widthPercent(100)
                .storageKey("test/fig.png")
                .originalFilename("test.png")
                .fileSizeBytes(67L)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private String extractAllText(XWPFDocument doc) {
        StringBuilder sb = new StringBuilder();
        for (XWPFParagraph p : doc.getParagraphs()) {
            sb.append(p.getText()).append("\n");
        }
        return sb.toString();
    }

    @Test
    void shouldNotRenderWhenFiguresEmpty() {
        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of());

        String text = extractAllText(doc);
        assertThat(text).doesNotContain("LISTA DE FIGURAS");
        assertThat(doc.getParagraphs()).isEmpty();
    }

    @Test
    void shouldRenderFigureList() {
        Figure fig1 = buildFigure("Diagrama de classes");
        Figure fig2 = buildFigure("Fluxo de dados");

        NumberedFigure nf1 = new NumberedFigure(fig1, MINIMAL_PNG, 1);
        NumberedFigure nf2 = new NumberedFigure(fig2, MINIMAL_PNG, 2);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(nf1, nf2));

        String text = extractAllText(doc);
        assertThat(text).contains("LISTA DE FIGURAS");
        assertThat(text).contains("Figura 1");
        assertThat(text).contains("Figura 2");
    }

    @Test
    void shouldRenderCorrectCaptions() {
        Figure fig1 = buildFigure("Arquitetura do sistema");
        Figure fig2 = buildFigure("Resultados experimentais");

        NumberedFigure nf1 = new NumberedFigure(fig1, MINIMAL_PNG, 1);
        NumberedFigure nf2 = new NumberedFigure(fig2, MINIMAL_PNG, 2);

        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, List.of(nf1, nf2));

        String text = extractAllText(doc);
        assertThat(text).contains("Arquitetura do sistema");
        assertThat(text).contains("Resultados experimentais");
        assertThat(text).contains("Figura 1 – Arquitetura do sistema");
        assertThat(text).contains("Figura 2 – Resultados experimentais");
    }
}
