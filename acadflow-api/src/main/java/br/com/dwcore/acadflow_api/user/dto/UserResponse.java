package br.com.dwcore.acadflow_api.user.dto;

import br.com.dwcore.acadflow_api.user.domain.User;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String email,
        String role,
        String plan,
        LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getPlan().name(),
                user.getCreatedAt()
        );
    }
}
