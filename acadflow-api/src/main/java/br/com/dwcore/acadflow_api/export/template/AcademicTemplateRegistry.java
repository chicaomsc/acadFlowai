package br.com.dwcore.acadflow_api.export.template;

/**
 * Central catalog of built-in academic templates.
 * Add new institutional profiles here as static constants.
 */
public final class AcademicTemplateRegistry {

    /** Generic ABNT NBR 14724:2011 template — used when no specific profile is set. */
    public static final AcademicTemplate ABNT_GENERIC = new AcademicTemplate(
            AcademicTemplateType.ABNT_GENERIC,
            "Resumo",
            "Abstract",
            "Sumário",
            "LISTA DE FIGURAS",
            "LISTA DE TABELAS",
            "LISTA DE QUADROS",
            "Referências",
            "Trabalho apresentado ao curso de {course} da {institution} "
                    + "como requisito parcial para a obtenção do grau de {degree}."
    );

    /** FEMAF — Faculdade de Educação, Marketing e Administração de Formosa. */
    public static final AcademicTemplate FEMAF = new AcademicTemplate(
            AcademicTemplateType.FEMAF,
            "Resumo",
            "Abstract",
            "Sumário",
            "LISTA DE FIGURAS",
            "LISTA DE TABELAS",
            "LISTA DE QUADROS",
            "Referências",
            "Monografia apresentada ao Curso de {course} da {institution} "
                    + "como requisito parcial para obtenção do título de {degree}."
    );

    private AcademicTemplateRegistry() {}

    /**
     * Returns the template for a given type.
     * Null resolves to {@link #ABNT_GENERIC} (default profile).
     * Adding a new {@link AcademicTemplateType} without updating this switch is a compile error.
     */
    public static AcademicTemplate forType(AcademicTemplateType type) {
        if (type == null) return ABNT_GENERIC;
        return switch (type) {
            case ABNT_GENERIC -> ABNT_GENERIC;
            case FEMAF        -> FEMAF;
        };
    }
}
