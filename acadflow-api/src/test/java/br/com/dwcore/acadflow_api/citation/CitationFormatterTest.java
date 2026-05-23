package br.com.dwcore.acadflow_api.citation;

import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.citation.domain.CitationDisplayMode;
import br.com.dwcore.acadflow_api.citation.domain.CitationType;
import br.com.dwcore.acadflow_api.citation.service.CitationFormatter;
import br.com.dwcore.acadflow_api.reference.domain.Reference;
import br.com.dwcore.acadflow_api.reference.domain.ReferenceType;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CitationFormatterTest {

    private Reference buildRef(String authors) {
        return Reference.builder().id(UUID.randomUUID())
                .title("Clean Code").authors(authors)
                .type(ReferenceType.BOOK).year(2008)
                .abntFormatted("MARTIN, R. C.. Clean Code. 2008.")
                .hasCitation(false).build();
    }

    private Citation buildCitation(CitationType type, String authors, String page,
                                   String quotedText, String apudAuthor, String apudYear) {
        return buildCitation(type, authors, page, quotedText, apudAuthor, apudYear, CitationDisplayMode.PARENTHETICAL);
    }

    private Citation buildCitation(CitationType type, String authors, String page,
                                   String quotedText, String apudAuthor, String apudYear,
                                   CitationDisplayMode displayMode) {
        return Citation.builder().id(UUID.randomUUID())
                .reference(buildRef(authors))
                .type(type)
                .displayMode(displayMode)
                .pageNumber(page)
                .quotedText(quotedText)
                .apudAuthor(apudAuthor)
                .apudYear(apudYear)
                .build();
    }

    // ── PARENTHETICAL (default) ──────────────────────────────────────────────

    @Test
    void indirectParentheticalFormatsCorrectly() {
        Citation c = buildCitation(CitationType.INDIRECT, "MARTIN, R. C.", null, null, null, null);
        assertThat(CitationFormatter.format(c)).isEqualTo("(MARTIN, 2008)");
    }

    @Test
    void indirectParentheticalWithLastNameOnlyAuthor() {
        Citation c = buildCitation(CitationType.INDIRECT, "Silva", null, null, null, null);
        assertThat(CitationFormatter.format(c)).isEqualTo("(SILVA, 2008)");
    }

    @Test
    void directShortParentheticalWithPage() {
        Citation c = buildCitation(CitationType.DIRECT_SHORT, "MARTIN, R. C.", "p. 42", "texto citado", null, null);
        assertThat(CitationFormatter.format(c)).isEqualTo("\"texto citado\" (MARTIN, 2008, p. 42)");
    }

    @Test
    void directShortParentheticalWithoutPage() {
        Citation c = buildCitation(CitationType.DIRECT_SHORT, "MARTIN, R. C.", null, "texto citado", null, null);
        assertThat(CitationFormatter.format(c)).isEqualTo("\"texto citado\" (MARTIN, 2008)");
    }

    @Test
    void directLongParentheticalFormatsReference() {
        Citation c = buildCitation(CitationType.DIRECT_LONG, "MARTIN, R. C.", "p. 100", "longo texto citado", null, null);
        assertThat(CitationFormatter.format(c)).isEqualTo("(MARTIN, 2008, p. 100)");
    }

    @Test
    void apudParentheticalFormatsCorrectly() {
        Citation c = buildCitation(CitationType.APUD, "MARTIN, R. C.", null, null, "FOWLER", "2003");
        assertThat(CitationFormatter.format(c)).isEqualTo("(MARTIN apud FOWLER, 2003)");
    }

    @Test
    void apudParentheticalAuthorIsUppercased() {
        Citation c = buildCitation(CitationType.APUD, "SILVA, J.", null, null, "santos", "2010");
        assertThat(CitationFormatter.format(c)).isEqualTo("(SILVA apud SANTOS, 2010)");
    }

    // ── NARRATIVE ────────────────────────────────────────────────────────────

    @Test
    void indirectNarrativeFormatsCorrectly() {
        Citation c = buildCitation(CitationType.INDIRECT, "MARTIN, R. C.", null, null, null, null, CitationDisplayMode.NARRATIVE);
        assertThat(CitationFormatter.format(c)).isEqualTo("Martin (2008)");
    }

    @Test
    void directShortNarrativeWithPage() {
        Citation c = buildCitation(CitationType.DIRECT_SHORT, "MARTIN, R. C.", "p. 42", "texto citado", null, null, CitationDisplayMode.NARRATIVE);
        assertThat(CitationFormatter.format(c)).isEqualTo("Martin (2008, p. 42): \"texto citado\"");
    }

    @Test
    void directLongNarrativeFormatsCorrectly() {
        Citation c = buildCitation(CitationType.DIRECT_LONG, "SILVA, J.", "p. 10", "longo trecho", null, null, CitationDisplayMode.NARRATIVE);
        assertThat(CitationFormatter.format(c)).isEqualTo("Silva (2008, p. 10)");
    }

    @Test
    void apudNarrativeFormatsCorrectly() {
        Citation c = buildCitation(CitationType.APUD, "MARTIN, R. C.", null, null, "FOWLER", "2003", CitationDisplayMode.NARRATIVE);
        assertThat(CitationFormatter.format(c)).isEqualTo("Martin apud Fowler (2003)");
    }

    @Test
    void defaultDisplayModeIsParenthetical() {
        Citation c = Citation.builder().id(UUID.randomUUID())
                .reference(buildRef("SILVA, J."))
                .type(CitationType.INDIRECT)
                .build();
        assertThat(CitationFormatter.format(c)).isEqualTo("(SILVA, 2008)");
    }

    // ── author count (ABNT NBR 10520) ────────────────────────────────────────

    @Test
    void threeAuthorsListedWithoutEtAl() {
        Citation c = buildCitation(CitationType.INDIRECT, "SILVA, A.; SANTOS, B.; OLIVEIRA, C.", null, null, null, null);
        assertThat(CitationFormatter.format(c)).isEqualTo("(SILVA; SANTOS; OLIVEIRA, 2008)");
    }

    @Test
    void fourAuthorsUseEtAl() {
        Citation c = buildCitation(CitationType.INDIRECT, "SILVA, A.; SANTOS, B.; OLIVEIRA, C.; PEREIRA, D.", null, null, null, null);
        assertThat(CitationFormatter.format(c)).isEqualTo("(SILVA et al., 2008)");
    }

    // ── extractSurname ───────────────────────────────────────────────────────

    @Test
    void extractSurnameFromCommaFormat() {
        assertThat(CitationFormatter.extractSurname("MARTIN, R. C.")).isEqualTo("MARTIN");
    }

    @Test
    void extractSurnameFromSpaceFormat() {
        assertThat(CitationFormatter.extractSurname("Robert Martin")).isEqualTo("MARTIN");
    }

    @Test
    void extractSurnameWithEtAl() {
        assertThat(CitationFormatter.extractSurname("SILVA et al.")).isEqualTo("SILVA");
    }

    @Test
    void extractSurnameFromNullReturnsQuestionMark() {
        assertThat(CitationFormatter.extractSurname(null)).isEqualTo("?");
    }
}
