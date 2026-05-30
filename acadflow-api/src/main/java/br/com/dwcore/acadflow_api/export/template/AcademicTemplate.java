package br.com.dwcore.acadflow_api.export.template;

/**
 * Immutable configuration record for a specific academic formatting template.
 * All section labels and the nature-statement pattern are defined here so that
 * renderers never hard-code institution-specific text.
 *
 * Nature-statement placeholders: {course}, {institution}, {degree}.
 */
public record AcademicTemplate(
        AcademicTemplateType type,

        // Section labels (renderers pass these to DocxHelper.sectionHeading, which uppercases them)
        String resumoLabel,
        String abstractLabel,
        String summaryLabel,
        String figureListLabel,
        String tableListLabel,
        String quadroListLabel,
        String referencesLabel,

        // Title-page nature statement template
        String natureStatementPattern
) {
    public String buildNatureStatement(String course, String institution, String degree) {
        return natureStatementPattern
                .replace("{course}", course)
                .replace("{institution}", institution)
                .replace("{degree}", degree);
    }
}
