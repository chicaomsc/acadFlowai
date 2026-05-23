package br.com.dwcore.acadflow_api.citation.service;

import br.com.dwcore.acadflow_api.citation.domain.Citation;
import br.com.dwcore.acadflow_api.citation.domain.CitationDisplayMode;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

public final class CitationFormatter {

    private CitationFormatter() {}

    public static String format(Citation citation) {
        String authors = authorLabel(citation.getReference().getAuthors(), citation.getDisplayMode());
        int year = citation.getReference().getYear();
        return switch (citation.getType()) {
            case INDIRECT -> citation.getDisplayMode() == CitationDisplayMode.NARRATIVE
                    ? "%s (%d)".formatted(authors, year)
                    : "(%s, %d)".formatted(authors, year);
            case DIRECT_SHORT -> {
                String text = citation.getQuotedText() != null ? citation.getQuotedText() : "";
                String page = pageRef(citation.getPageNumber());
                // BUG-03: NARRATIVE → Author (year, p. X): "quote" — ABNT canonical order
                yield citation.getDisplayMode() == CitationDisplayMode.NARRATIVE
                        ? "%s (%d%s): \"%s\"".formatted(authors, year, page, text)
                        : "\"%s\" (%s, %d%s)".formatted(text, authors, year, page);
            }
            case DIRECT_LONG -> {
                String page = pageRef(citation.getPageNumber());
                yield citation.getDisplayMode() == CitationDisplayMode.NARRATIVE
                        ? "%s (%d%s)".formatted(authors, year, page)
                        : "(%s, %d%s)".formatted(authors, year, page);
            }
            case APUD -> {
                String cited = normalizeApudAuthor(citation.getApudAuthor(), citation.getDisplayMode());
                String apudYear = citation.getApudYear() != null ? citation.getApudYear() : "?";
                yield citation.getDisplayMode() == CitationDisplayMode.NARRATIVE
                        ? "%s apud %s (%s)".formatted(authors, cited, apudYear)
                        : "(%s apud %s, %s)".formatted(authors, cited, apudYear);
            }
        };
    }

    public static String extractSurname(String author) {
        if (author == null || author.isBlank()) return "?";
        String cleanAuthor = author.replaceAll("(?i)\\s*et\\.?\\s*al\\.?\\s*", "").trim();
        if (cleanAuthor.isBlank()) return "?";
        if (cleanAuthor.contains(",")) return cleanAuthor.split(",")[0].trim().toUpperCase(Locale.ROOT);
        String[] words = cleanAuthor.trim().split("\\s+");
        return words[words.length - 1].toUpperCase(Locale.ROOT);
    }

    private static String authorLabel(String authors, CitationDisplayMode mode) {
        if (authors == null || authors.isBlank()) return "?";

        List<String> parts = Arrays.stream(authors.split(";"))
                .map(String::trim)
                .filter(part -> !part.isBlank())
                .toList();

        if (parts.isEmpty()) return "?";

        // BUG-05: ABNT NBR 10520 — et al. only for 4+ authors; 1-3 listed individually
        String first = formatSurname(parts.get(0), mode);
        if (parts.size() == 1) return first;
        if (parts.size() == 2) return first + "; " + formatSurname(parts.get(1), mode);
        if (parts.size() == 3) return first + "; " + formatSurname(parts.get(1), mode)
                + "; " + formatSurname(parts.get(2), mode);
        return first + " et al.";
    }

    private static String formatSurname(String author, CitationDisplayMode mode) {
        String surname = extractSurname(author);
        if (mode == CitationDisplayMode.PARENTHETICAL || "?".equals(surname)) return surname;
        return surname.substring(0, 1) + surname.substring(1).toLowerCase(Locale.ROOT);
    }

    private static String normalizeApudAuthor(String author, CitationDisplayMode mode) {
        if (author == null || author.isBlank()) return "?";
        String normalized = author.trim();
        if (mode == CitationDisplayMode.PARENTHETICAL) return normalized.toUpperCase(Locale.ROOT);
        if (normalized.length() == 1) return normalized.toUpperCase(Locale.ROOT);
        return normalized.substring(0, 1).toUpperCase(Locale.ROOT) + normalized.substring(1).toLowerCase(Locale.ROOT);
    }

    private static String pageRef(String pageNumber) {
        return pageNumber != null && !pageNumber.isBlank() ? ", " + pageNumber : "";
    }
}
