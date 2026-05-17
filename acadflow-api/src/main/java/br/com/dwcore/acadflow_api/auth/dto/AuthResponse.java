package br.com.dwcore.acadflow_api.auth.dto;

import br.com.dwcore.acadflow_api.user.dto.UserResponse;

public record AuthResponse(String token, UserResponse user) {}
