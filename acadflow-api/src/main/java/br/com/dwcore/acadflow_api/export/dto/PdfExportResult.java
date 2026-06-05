package br.com.dwcore.acadflow_api.export.dto;

public record PdfExportResult(byte[] pdfBytes, String fileName) {}
