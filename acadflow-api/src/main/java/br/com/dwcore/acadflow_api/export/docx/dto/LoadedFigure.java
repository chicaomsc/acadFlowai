package br.com.dwcore.acadflow_api.export.docx.dto;

import br.com.dwcore.acadflow_api.figure.domain.Figure;

public record LoadedFigure(Figure figure, byte[] imageData) {}
