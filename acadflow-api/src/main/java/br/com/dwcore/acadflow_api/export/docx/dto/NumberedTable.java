package br.com.dwcore.acadflow_api.export.docx.dto;

import br.com.dwcore.acadflow_api.academictable.domain.AcademicTable;

public record NumberedTable(AcademicTable table, int number) {}
