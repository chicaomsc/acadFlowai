package br.com.dwcore.acadflow_api.auth;

import br.com.dwcore.acadflow_api.auth.dto.LoginRequest;
import br.com.dwcore.acadflow_api.auth.dto.RegisterRequest;
import br.com.dwcore.acadflow_api.auth.service.AuthService;
import br.com.dwcore.acadflow_api.security.JwtTokenProvider;
import br.com.dwcore.acadflow_api.shared.exception.BusinessException;
import br.com.dwcore.acadflow_api.shared.exception.UnauthorizedException;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.domain.UserPlan;
import br.com.dwcore.acadflow_api.user.domain.UserRole;
import br.com.dwcore.acadflow_api.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthService authService;

    @Test
    void shouldRegisterUserSuccessfully() {
        var request = new RegisterRequest("João Silva", "joao@email.com", "senha1234");

        when(userRepository.existsByEmail(request.email())).thenReturn(false);
        when(passwordEncoder.encode(request.password())).thenReturn("hash123");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u = User.builder()
                    .id(UUID.randomUUID())
                    .name(u.getName()).email(u.getEmail()).password(u.getPassword())
                    .role(u.getRole()).plan(u.getPlan())
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
            return u;
        });
        when(jwtTokenProvider.generateToken(any())).thenReturn("jwt.token.aqui");

        var response = authService.register(request);

        assertThat(response.token()).isEqualTo("jwt.token.aqui");
        assertThat(response.user().email()).isEqualTo("joao@email.com");
        assertThat(response.user().role()).isEqualTo("STUDENT");
        assertThat(response.user().plan()).isEqualTo("FREE");
    }

    @Test
    void shouldRegisterReturnsNonNullCreatedAt() {
        var request = new RegisterRequest("Ana Costa", "ana@email.com", "senha1234");

        when(userRepository.existsByEmail(request.email())).thenReturn(false);
        when(passwordEncoder.encode(request.password())).thenReturn("hash");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u = User.builder()
                    .id(UUID.randomUUID())
                    .name(u.getName()).email(u.getEmail()).password(u.getPassword())
                    .role(u.getRole()).plan(u.getPlan())
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
            return u;
        });
        when(jwtTokenProvider.generateToken(any())).thenReturn("token");

        var response = authService.register(request);

        assertThat(response.user().createdAt()).isNotNull();
    }

    @Test
    void shouldThrowWhenEmailAlreadyExists() {
        var request = new RegisterRequest("João", "duplicado@email.com", "senha1234");
        when(userRepository.existsByEmail(request.email())).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("E-mail já cadastrado");
    }

    @Test
    void shouldLoginSuccessfully() {
        var request = new LoginRequest("joao@email.com", "senha1234");
        User user = User.builder()
                .id(UUID.randomUUID())
                .name("João").email("joao@email.com").password("hash123")
                .role(UserRole.STUDENT).plan(UserPlan.FREE).build();

        when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(request.password(), user.getPassword())).thenReturn(true);
        when(jwtTokenProvider.generateToken(user.getEmail())).thenReturn("jwt.login.token");

        var response = authService.login(request);

        assertThat(response.token()).isEqualTo("jwt.login.token");
        assertThat(response.user().email()).isEqualTo("joao@email.com");
    }

    @Test
    void shouldThrowUnauthorizedOnInvalidPassword() {
        var request = new LoginRequest("joao@email.com", "errada");
        User user = User.builder()
                .id(UUID.randomUUID())
                .name("João").email("joao@email.com").password("hash123")
                .role(UserRole.STUDENT).plan(UserPlan.FREE).build();

        when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(request.password(), user.getPassword())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Credenciais inválidas");
    }

    @Test
    void shouldThrowUnauthorizedOnUnknownEmail() {
        var request = new LoginRequest("naoexiste@email.com", "senha");
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Credenciais inválidas");
    }
}
