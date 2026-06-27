package service.authservice.authservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import service.authservice.authservice.config.JwtUtils;
import service.authservice.authservice.dto.*;
import service.authservice.authservice.model.User;
import service.authservice.authservice.repository.UserRepository;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final RestTemplate restTemplate;

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

        if ("doctor".equalsIgnoreCase(savedUser.getRole())) {
            createDoctorProfileInUserService(savedUser.getUserId());
        }

        return AuthResponse.builder()
                .success(true)
                .message("User registered successfully.")
                .data(mapToUserResponseData(savedUser))
                .build();
    }

    private void createDoctorProfileInUserService(String userId) {
        try {
            restTemplate.postForEntity(
                    "http://localhost:8002/api/v1/internal/doctor-profile/" + userId,
                    null,
                    Void.class
            );
        } catch (Exception e) {
            System.err.println("Could not create doctor profile for userId " + userId + ": " + e.getMessage());
        }
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
    public AuthResponse getUserById(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found."));
        return AuthResponse.builder()
                .success(true)
                .data(mapToUserResponseData(user))
                .build();
    }

    public AuthResponse getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No user with that email."));
        return AuthResponse.builder()
                .success(true)
                .data(mapToUserResponseData(user))
                .build();
    }

    public void logout(String token) {
        System.out.println("Token successfully invalidated on logout: " + token);
    }

    public Map<String, Long> getUserRoleCounts() {
        Map<String, Long> counts = new HashMap<>();
        counts.put("patients", userRepository.countByRoleIgnoreCase("patient"));
        counts.put("doctors", userRepository.countByRoleIgnoreCase("doctor"));
        counts.put("pharmacists", userRepository.countByRoleIgnoreCase("pharmacist"));
        return counts;
    }

    /**
     * Returns every user (password stripped) for the admin user-list page.
     * Called by userservice's /api/v1/admin/users endpoint.
     */
    public java.util.List<Map<String, Object>> listAllUsers() {
        java.util.List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (User u : userRepository.findAll()) {
            Map<String, Object> row = new HashMap<>();
            row.put("userId", u.getUserId());
            row.put("name", u.getName());
            row.put("email", u.getEmail());
            row.put("role", u.getRole());
            row.put("phone", u.getPhone());
            row.put("bloodGroup", u.getBloodGroup());
            row.put("approval", u.getApproval());
            row.put("createdAt", u.getCreatedAt());
            row.put("updatedAt", u.getUpdatedAt());
            out.add(row);
        }
        return out;
    }

    /**
     * Update a user's role (called by admin endpoint). Throws if id unknown.
     */
    public Map<String, Object> changeUserRole(String userId, String newRole) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found."));
        u.setRole(newRole);
        userRepository.save(u);
        Map<String, Object> row = new HashMap<>();
        row.put("userId", u.getUserId());
        row.put("name", u.getName());
        row.put("email", u.getEmail());
        row.put("role", u.getRole());
        row.put("success", true);
        row.put("message", "Role updated.");
        return row;
    }

    /**
     * Delete a user by id. Returns success map.
     */
    public Map<String, Object> deleteUser(String userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found.");
        }
        userRepository.deleteById(userId);
        return Map.of(
                "success", true,
                "message", "User deleted."
        );
    }
}