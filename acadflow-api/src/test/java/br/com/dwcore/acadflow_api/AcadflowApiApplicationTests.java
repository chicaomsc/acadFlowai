package br.com.dwcore.acadflow_api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class AcadflowApiApplicationTests {

	@Test
	void contextLoads() {
	}

}
