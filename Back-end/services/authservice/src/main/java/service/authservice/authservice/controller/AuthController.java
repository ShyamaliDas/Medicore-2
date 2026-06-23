package service.authservice.authservice.controller;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import service.authservice.authservice.config.JwtUtils;
import service.authservice.authservice.dto.*;
import service.authservice.authservice.service.AuthService;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor // create constractor for final field
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@RequestBody SignupRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return new ResponseEntity<>(response, HttpStatus.CREATED);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(AuthResponse.builder().success(false).message(e.getMessage()).build());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.builder().success(false).message(e.getMessage()).build());
        }
    }

    @Autowired
     private JwtUtils jwtUtils;

@PostMapping("/logout")
public ResponseEntity<AuthResponse> logout(@RequestHeader("Authorization") String tokenHeader) {
    try {
        // 1. Check if the header format is correct
        String token = null;
        if (tokenHeader != null && tokenHeader.startsWith("Bearer ")) {
            token = tokenHeader.substring(7);
        }

        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(AuthResponse.builder().success(false).message("Missing token.").build());
        }

 
        try {
            // This will parse the token. If the signature is wrong or expired, it throws an exception.
            String email = jwtUtils.extractEmail(token); 
            
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(AuthResponse.builder().success(false).message("Invalid token claims.").build());
            }
        } catch (Exception jwtException) {
            // Captures expired, forged, or malformed tokens
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.builder().success(false).message("Invalid or expired token.").build());
        }

 
        
        authService.logout(token);

        return ResponseEntity.ok(
            AuthResponse.builder()
                .success(true)
                .message("Logged out successfully. Token cleared.")
                .build()
        );
    } catch (Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(AuthResponse.builder().success(false).message(e.getMessage()).build());
    }
}
}