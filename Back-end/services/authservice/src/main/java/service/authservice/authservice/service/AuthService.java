package service.authservice.authservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import service.authservice.authservice.config.JwtUtils;
import service.authservice.authservice.dto.*;
import service.authservice.authservice.model.User;
import service.authservice.authservice.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthResponse register(SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already registered.");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .phone(request.getPhone())
                .bloodGroup(request.getBloodGroup())
                .build();

        User savedUser = userRepository.save(user);

        return AuthResponse.builder()
                .success(true)
                .message("User registered successfully.")
                .data(mapToUserResponseData(savedUser))
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password.");
        }
          
        String token = jwtUtils.generateAccessToken(user);

        return AuthResponse.builder()
                .success(true)
                .message("Login successful.")
                .accessToken(token)
                .data(mapToUserResponseData(user))
                .build();
    }

    private UserResponseData mapToUserResponseData(User user) {
        return UserResponseData.builder()
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().toLowerCase())
                .phone(user.getPhone())
                .bloodGroup(user.getBloodGroup())
                .approval(user.getApproval())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
    public void logout(String token) {
    System.out.println("Token successfully invalidated on logout: " + token);
}
}