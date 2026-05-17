package br.com.dwcore.acadflow_api;

import org.springframework.boot.SpringApplication;

public class TestAcadflowApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(AcadflowApiApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
