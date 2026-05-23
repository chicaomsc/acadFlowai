package br.com.dwcore.acadflow_api.citation.service;

import br.com.dwcore.acadflow_api.citation.domain.Citation;

public final class CitationFormatter {

    private CitationFormatter() {}

    public static String format(Citation citation) {
        String surname = extractSurname(citation.getReference().getAuthors());
        int year = citation.getReference().getYear();
        return switch (citation.getType()) {
            case INDIRECT -> "(%s, %d)".formatted(surname, year);
            case DIRECT_SHORT -> {
                String text = citation.getQuotedText() != null ? citation.getQuotedText() : "";
                String page = pageRef(citation.getPageNumber());
                yield "\"%s\" (%s, %d%s)".formatted(text, surname, year, page);
            }
            case DIRECT_LONG -> {
                String page = pageRef(citation.getPageNumber());
                yield "(%s, %d%s)".formatted(surname, year, page);
            }
            case APUD -> {
                String cited = citation.getApudAuthor() != null ? citation.getApudAuthor().toUpperCase() : "?";
                String apudYear = citation.getApudYear() != null ? citation.getApudYear() : "?";
                yield "(%s apud %s, %s)".formatted(surname, cited, apudYear);
            }
        };
    }

    public static String extractSurname(String authors) {
        if (authors == null || authors.isBlank()) return "?";
        String firstAuthor = authors.split(";")[0].trim();
        firstAuthor = firstAuthor.replaceAll("(?i)\\s*et\\.?\\s*al\\.?\\s*", "").trim();
        if (firstAuthor.isBlank()) return "?";
        if (firstAuthor.contains(",")) return firstAuthor.split(",")[0].trim().toUpperCase();
        String[] words = firstAuthor.trim().split("\\s+");
        return words[words.length - 1].toUpperCase();
    }

    private static String pageRef(String pageNumber) {
        return pageNumber != null && !pageNumber.isBlank() ? ", " + pageNumber : "";
    }
}
