package br.com.dwcore.acadflow_api.project.domain;

public enum AcademicDegree {

    GRADUACAO("Graduação"),
    ESPECIALIZACAO("Especialização"),
    MESTRADO("Mestrado"),
    DOUTORADO("Doutorado");

    private final String label;

    AcademicDegree(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
