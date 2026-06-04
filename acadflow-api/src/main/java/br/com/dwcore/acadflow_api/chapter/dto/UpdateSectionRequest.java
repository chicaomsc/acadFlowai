package br.com.dwcore.acadflow_api.chapter.dto;

public record UpdateSectionRequest(
        String title,
        String content,
        Integer sectionOrder
) {}
