package service.authservice.authservice.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
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

    /**
     * Return every user (sans password) — consumed by userservice
     * admin endpoints. Internal-only: caller is a trusted microservice.
     */
    @GetMapping("/all-users")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", authService.listAllUsers()
        ));
    }

    /**
     * Change a user's role. Internal-only — only userservice's admin
     * controller is expected to call this.
     */
    @PatchMapping("/users/{id}/role")
    public ResponseEntity<?> changeRole(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        try {
            String role = String.valueOf(payload.get("role"));
            return ResponseEntity.ok(authService.changeUserRole(id, role));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Delete a user record. Internal-only.
     */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        try {
            return ResponseEntity.ok(authService.deleteUser(id));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }
}
