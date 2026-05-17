package br.com.dwcore.acadflow_api.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitServiceTest {

    @Test
    void shouldAllowRequestsWithinLimit() {
        var service = new RateLimitService(5, 60_000);
        String key = "/auth/login:127.0.0.1";

        for (int i = 0; i < 5; i++) {
            assertThat(service.isAllowed(key)).isTrue();
        }
    }

    @Test
    void shouldBlockAfterExceedingLimit() {
        var service = new RateLimitService(5, 60_000);
        String key = "/auth/login:127.0.0.1";

        for (int i = 0; i < 5; i++) {
            service.isAllowed(key);
        }

        assertThat(service.isAllowed(key)).isFalse();
    }

    @Test
    void shouldAllowAfterWindowExpires() throws InterruptedException {
        var service = new RateLimitService(2, 100); // janela de 100ms
        String key = "/auth/login:127.0.0.1";

        service.isAllowed(key);
        service.isAllowed(key);
        assertThat(service.isAllowed(key)).isFalse(); // bloqueado na 3ª chamada

        Thread.sleep(150); // aguarda expiração da janela

        assertThat(service.isAllowed(key)).isTrue(); // janela reiniciada
    }

    @Test
    void shouldTrackDifferentIpsIndependently() {
        var service = new RateLimitService(1, 60_000);

        assertThat(service.isAllowed("/auth/login:1.1.1.1")).isTrue();
        assertThat(service.isAllowed("/auth/login:2.2.2.2")).isTrue();  // IP diferente: permitido
        assertThat(service.isAllowed("/auth/login:1.1.1.1")).isFalse(); // mesmo IP: bloqueado
    }

    @Test
    void shouldTrackDifferentEndpointsIndependently() {
        var service = new RateLimitService(1, 60_000);
        String ip = "127.0.0.1";

        assertThat(service.isAllowed("/auth/login:" + ip)).isTrue();
        assertThat(service.isAllowed("/auth/register:" + ip)).isTrue(); // endpoint diferente: permitido
        assertThat(service.isAllowed("/auth/login:" + ip)).isFalse();   // mesma chave: bloqueado
    }
}
