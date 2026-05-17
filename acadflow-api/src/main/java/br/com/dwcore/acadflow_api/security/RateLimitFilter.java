package br.com.dwcore.acadflow_api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;
    private final boolean trustProxy;

    private static final Set<String> PROTECTED = Set.of("/auth/login", "/auth/register");

    public RateLimitFilter(
            RateLimitService rateLimitService,
            @Value("${app.rate-limit.trust-proxy:false}") boolean trustProxy) {
        this.rateLimitService = rateLimitService;
        this.trustProxy = trustProxy;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !PROTECTED.contains(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String key = request.getRequestURI() + ":" + extractIp(request);

        if (!rateLimitService.isAllowed(key)) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(
                    "{\"success\":false,\"message\":\"Muitas tentativas. Tente novamente em instantes.\",\"data\":null}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String extractIp(HttpServletRequest request) {
        if (trustProxy) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                return xff.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
