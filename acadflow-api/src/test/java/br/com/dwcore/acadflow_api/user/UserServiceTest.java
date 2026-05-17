package br.com.dwcore.acadflow_api.user;

import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.domain.UserPlan;
import br.com.dwcore.acadflow_api.user.domain.UserRole;
import br.com.dwcore.acadflow_api.user.dto.UpdateProfileRequest;
import br.com.dwcore.acadflow_api.user.dto.UserResponse;
import br.com.dwcore.acadflow_api.user.repository.UserRepository;
import br.com.dwcore.acadflow_api.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void shouldUpdateUserName() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .name("Nome Antigo")
                .email("aluno@email.com")
                .password("hash")
                .role(UserRole.STUDENT)
                .plan(UserPlan.FREE)
                .build();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserResponse response = userService.updateProfile(user.getEmail(), new UpdateProfileRequest("Nome Novo"));

        assertThat(response.name()).isEqualTo("Nome Novo");
    }
}
