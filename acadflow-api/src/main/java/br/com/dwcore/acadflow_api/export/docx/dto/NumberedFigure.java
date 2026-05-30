package br.com.dwcore.acadflow_api.export.docx.dto;

import br.com.dwcore.acadflow_api.figure.domain.Figure;

public record NumberedFigure(Figure figure, byte[] imageData, int number) {}
