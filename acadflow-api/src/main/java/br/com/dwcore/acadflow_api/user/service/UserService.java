package br.com.dwcore.acadflow_api.user.service;

import br.com.dwcore.acadflow_api.shared.exception.ResourceNotFoundException;
import br.com.dwcore.acadflow_api.user.domain.User;
import br.com.dwcore.acadflow_api.user.dto.UpdateProfileRequest;
import br.com.dwcore.acadflow_api.user.dto.UserResponse;
import br.com.dwcore.acadflow_api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserResponse findByEmail(String email) {
        return UserResponse.from(findEntityByEmail(email));
    }

    public User findEntityByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
    }

    @Transactional
    public UserResponse updateProfile(String userEmail, UpdateProfileRequest request) {
        User user = findEntityByEmail(userEmail);
        user.setName(request.name());
        return UserResponse.from(userRepository.save(user));
    }
}
