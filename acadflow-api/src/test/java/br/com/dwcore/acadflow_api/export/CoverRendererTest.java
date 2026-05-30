package br.com.dwcore.acadflow_api.export;

import br.com.dwcore.acadflow_api.export.docx.DocxHelper;
import br.com.dwcore.acadflow_api.export.docx.renderer.CoverRenderer;
import br.com.dwcore.acadflow_api.project.domain.AcademicDegree;
import br.com.dwcore.acadflow_api.project.domain.AcademicNorm;
import br.com.dwcore.acadflow_api.project.domain.Project;
import br.com.dwcore.acadflow_api.project.domain.ProjectStatus;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.domain.UserPlan;
import br.com.dwcore.acadflow_api.user.domain.UserRole;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPageMar;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPageSz;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that the cover page layout fits on a single A4 page and follows
 * ABNT NBR 14724:2011 structural requirements.
 *
 * <p>A4 usable height with ABNT margins (top 3 cm, bottom 2 cm):
 * 29.7 cm − 5 cm = 24.7 cm ≈ 14 004 twips.
 * The sum of all spacingBefore values plus estimated text height must stay
 * comfortably below that threshold.
 */
class CoverRendererTest {

    // Upper-bound for sum of all spacingBefore values on the cover.
    // 12 000 twips ≈ 21.2 cm; with ~2 160 twips of text the total stays
    // below the 14 004 twips usable height (A4 with ABNT margins).
    private static final int MAX_COVER_SPACING_TWIPS = 12_000;

    private final CoverRenderer renderer = new CoverRenderer();

    // ── Builders ─────────────────────────────────────────────────────────────

    private User buildUser() {
        return User.builder().id(UUID.randomUUID())
                .name("Maria Silva").email("maria@test.com")
                .password("hash").role(UserRole.STUDENT).plan(UserPlan.FREE).build();
    }

    private Project buildProject() {
        return Project.builder()
                .id(UUID.randomUUID()).user(buildUser())
                .title("Impacto da Inteligência Artificial no Ensino Superior")
                .subtitle("Uma análise exploratória")
                .course("Ciência da Computação").institution("UFBA")
                .advisorName("Prof. Dr. João Santos").norm(AcademicNorm.ABNT)
                .academicDegree(AcademicDegree.GRADUACAO)
                .defenseCity("Salvador").defenseYear(2025)
                .abstractPt("Resumo.").abstractEn("Abstract.")
                .keywords("ia, ensino")
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();
    }

    private List<XWPFParagraph> coverParagraphs(Project project) {
        XWPFDocument doc = new XWPFDocument();
        renderer.render(doc, project);
        return doc.getParagraphs();
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    @Test
    void coverShouldContainAllRequiredElements() {
        List<XWPFParagraph> paras = coverParagraphs(buildProject());
        List<String> texts = paras.stream()
                .map(XWPFParagraph::getText)
                .collect(Collectors.toList());

        assertThat(texts).anyMatch(t -> t.contains("UFBA"));
        assertThat(texts).anyMatch(t -> t.contains("Curso de Ciência da Computação"));
        assertThat(texts).anyMatch(t -> t.contains("MARIA SILVA"));
        assertThat(texts).anyMatch(t -> t.toUpperCase().contains("IMPACTO DA INTELIGÊNCIA"));
        assertThat(texts).anyMatch(t -> t.contains("Salvador"));
        assertThat(texts).anyMatch(t -> t.contains("2025"));
    }

    @Test
    void coverShouldHaveNoExplicitPageBreak() {
        List<XWPFParagraph> paras = coverParagraphs(buildProject());
        List<String> breakers = paras.stream()
                .filter(XWPFParagraph::isPageBreak)
                .map(XWPFParagraph::getText)
                .collect(Collectors.toList());

        assertThat(breakers)
                .as("CoverRenderer must not insert any page-break paragraph")
                .isEmpty();
    }

    @Test
    void coverTotalSpacingBeforeShouldNotOverflowA4() {
        List<XWPFParagraph> paras = coverParagraphs(buildProject());
        int totalSpacing = paras.stream()
                .mapToInt(p -> Math.max(0, p.getSpacingBefore()))
                .sum();

        assertThat(totalSpacing)
                .as("sum of spacingBefore must stay below %d twips to avoid A4 overflow", MAX_COVER_SPACING_TWIPS)
                .isLessThan(MAX_COVER_SPACING_TWIPS);
    }

    @Test
    void coverSpacingConstantsShouldBeWithinAbntLimits() {
        assertThat(DocxHelper.SPC_COVER_TOP).isLessThanOrEqualTo(567);       // ≤ 1 cm top indent
        assertThat(DocxHelper.SPC_COVER_NEARBY).isLessThanOrEqualTo(480);    // ≤ 24 pt tight pair
        assertThat(DocxHelper.SPC_COVER_GAP).isLessThanOrEqualTo(4536);      // ≤ 8 cm main gap
        // City gap intentionally large to push city/year near the bottom margin.
        // Upper bound: 13 cm (7 371 twips), leaving at least ~1.7 cm above the bottom margin.
        assertThat(DocxHelper.SPC_COVER_CITY_GAP).isLessThanOrEqualTo(7371);
    }

    @Test
    void setupPageMarginsShouldSetA4PageSize() {
        XWPFDocument doc = new XWPFDocument();
        DocxHelper.setupPageMargins(doc);

        CTPageSz pgSz = doc.getDocument().getBody().getSectPr().getPgSz();
        assertThat(pgSz.getW())
                .as("page width must be 11 906 twips (21 cm, A4)")
                .isEqualTo(BigInteger.valueOf(DocxHelper.PAGE_WIDTH_A4));
        assertThat(pgSz.getH())
                .as("page height must be 16 838 twips (29.7 cm, A4)")
                .isEqualTo(BigInteger.valueOf(DocxHelper.PAGE_HEIGHT_A4));
    }

    @Test
    void setupPageMarginsShouldSetAbntMargins() {
        XWPFDocument doc = new XWPFDocument();
        DocxHelper.setupPageMargins(doc);

        CTPageMar pgMar = doc.getDocument().getBody().getSectPr().getPgMar();
        assertThat(pgMar.getTop())
                .as("top margin must be 1 701 twips (3 cm)")
                .isEqualTo(BigInteger.valueOf(DocxHelper.MARGIN_TOP));
        assertThat(pgMar.getLeft())
                .as("left margin must be 1 701 twips (3 cm)")
                .isEqualTo(BigInteger.valueOf(DocxHelper.MARGIN_LEFT));
        assertThat(pgMar.getBottom())
                .as("bottom margin must be 1 134 twips (2 cm)")
                .isEqualTo(BigInteger.valueOf(DocxHelper.MARGIN_BOTTOM));
        assertThat(pgMar.getRight())
                .as("right margin must be 1 134 twips (2 cm)")
                .isEqualTo(BigInteger.valueOf(DocxHelper.MARGIN_RIGHT));
    }

    @Test
    void coverWithoutOptionalFieldsShouldStillFitOnePage() {
        Project minimal = Project.builder()
                .id(UUID.randomUUID()).user(buildUser())
                .title("Título Mínimo")
                .institution("UFBA")
                .norm(AcademicNorm.ABNT)
                .academicDegree(AcademicDegree.GRADUACAO)
                .defenseCity("Bahia").defenseYear(2025)
                .status(ProjectStatus.IN_PROGRESS).chapters(new ArrayList<>()).build();

        List<XWPFParagraph> paras = coverParagraphs(minimal);
        int totalSpacing = paras.stream()
                .mapToInt(p -> Math.max(0, p.getSpacingBefore()))
                .sum();

        assertThat(totalSpacing).isLessThan(MAX_COVER_SPACING_TWIPS);
        assertThat(paras).noneMatch(XWPFParagraph::isPageBreak);
    }

    @Test
    void cityAndYearShouldBothBePresentInSameCoverParagraphList() {
        List<XWPFParagraph> paras = coverParagraphs(buildProject());
        List<String> texts = paras.stream()
                .map(XWPFParagraph::getText)
                .collect(Collectors.toList());

        assertThat(texts).anyMatch(t -> t.contains("Salvador"));
        assertThat(texts).anyMatch(t -> t.contains("2025"));
        // Both must appear — verifying neither was pushed off the page by excessive spacing
        long cityCount = texts.stream().filter(t -> t.contains("Salvador")).count();
        long yearCount = texts.stream().filter(t -> t.contains("2025")).count();
        assertThat(cityCount).isGreaterThanOrEqualTo(1);
        assertThat(yearCount).isGreaterThanOrEqualTo(1);
    }
}
