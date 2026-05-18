package br.com.dwcore.acadflow_api.citation;

import br.com.dwcore.acadflow_api.citation.domain.Citation;
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
        return Citation.builder().id(UUID.randomUUID())
                .reference(buildRef(authors))
                .type(type)
                .pageNumber(page)
                .quotedText(quotedText)
                .apudAuthor(apudAuthor)
                .apudYear(apudYear)
                .build();
    }

    @Test
    void indirectCitationFormatsCorrectly() {
        Citation c = buildCitation(CitationType.INDIRECT, "MARTIN, R. C.", null, null, null, null);
        assertThat(CitationFormatter.format(c)).isEqualTo("(MARTIN, 2008)");
    }

    @Test
    void indirectCitationWithLastNameOnlyAuthor() {
        Citation c = buildCitation(CitationType.INDIRECT, "Silva", null, null, null, null);
        assertThat(CitationFormatter.format(c)).isEqualTo("(SILVA, 2008)");
    }

    @Test
    void directShortWithPage() {
        Citation c = buildCitation(CitationType.DIRECT_SHORT, "MARTIN, R. C.", "p. 42", "texto citado", null, null);
        assertThat(CitationFormatter.format(c)).isEqualTo("\"texto citado\" (MARTIN, 2008, p. 42)");
    }

    @Test
    void directShortWithoutPage() {
        Citation c = buildCitation(CitationType.DIRECT_SHORT, "MARTIN, R. C.", null, "texto citado", null, null);
        assertThat(CitationFormatter.format(c)).isEqualTo("\"texto citado\" (MARTIN, 2008)");
    }

    @Test
    void directLongFormatsReference() {
        Citation c = buildCitation(CitationType.DIRECT_LONG, "MARTIN, R. C.", "p. 100", "longo texto citado", null, null);
        assertThat(CitationFormatter.format(c)).isEqualTo("(MARTIN, 2008, p. 100)");
    }

    @Test
    void apudFormatsCorrectly() {
        Citation c = buildCitation(CitationType.APUD, "MARTIN, R. C.", null, null, "FOWLER", "2003");
        assertThat(CitationFormatter.format(c)).isEqualTo("(MARTIN apud FOWLER, 2003)");
    }

    @Test
    void apudAuthorIsUppercased() {
        Citation c = buildCitation(CitationType.APUD, "SILVA, J.", null, null, "santos", "2010");
        assertThat(CitationFormatter.format(c)).isEqualTo("(SILVA apud SANTOS, 2010)");
    }

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
