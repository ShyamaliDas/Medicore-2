package service.authservice.authservice.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import service.authservice.authservice.service.AuthService;

@RestController
@RequestMapping("/api/v1/internal")
@RequiredArgsConstructor
public class InternalController {

    private final AuthService authService;

    @GetMapping("/user-stats")
    public ResponseEntity<?> getUserStats() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", authService.getUserRoleCounts()
        ));
    }
}
