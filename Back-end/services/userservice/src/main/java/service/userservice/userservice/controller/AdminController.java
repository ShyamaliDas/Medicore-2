package service.userservice.userservice.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import lombok.RequiredArgsConstructor;
import service.userservice.userservice.context.UserContext;
import service.userservice.userservice.model.DoctorProfile;
import service.userservice.userservice.repository.DoctorProfileRepository;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final DoctorProfileRepository doctorRepo;
    private final RestTemplate restTemplate;

    private boolean isNotAdmin() {
        return !"admin".equalsIgnoreCase(UserContext.getRole());
    }

    private ResponseEntity<Map<String, Object>> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "message", "Forbidden: Admin access required."
        ));
    }

    /**
     * Approve a doctor. Admin-only.
     */
    @PatchMapping("/approve-doctor/{id}")
    public ResponseEntity<Map<String, Object>> approveDoctor(@PathVariable String id) {
        if (isNotAdmin()) return forbidden();

        DoctorProfile doc = doctorRepo.findById(id).orElseGet(() -> {
            DoctorProfile profile = new DoctorProfile();
            profile.setUserId(id);
            profile.setRating(5.0);
            return profile;
        });

        doc.setApproval(true);
        DoctorProfile saved = doctorRepo.save(doc);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Doctor status has been updated to Approved.",
                "data", Map.of(
                        "doctorId", saved.getUserId(),
                        "role", "doctor",
                        "approval", true,
                        "updatedAt", saved.getUpdatedAt()
                )
        ));
    }

    /**
     * Disapprove (revoke approval for) a doctor. Admin-only.
     */
    @PatchMapping("/disapprove-doctor/{id}")
    public ResponseEntity<Map<String, Object>> disapproveDoctor(@PathVariable String id) {
        if (isNotAdmin()) return forbidden();

        DoctorProfile doc = doctorRepo.findById(id).orElse(null);
        if (doc == null) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "Doctor profile not found."
            ));
        }

        doc.setApproval(false);
        DoctorProfile saved = doctorRepo.save(doc);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Doctor approval has been revoked.",
                "data", Map.of(
                        "doctorId", saved.getUserId(),
                        "role", "doctor",
                        "approval", false,
                        "updatedAt", saved.getUpdatedAt()
                )
        ));
    }

    /**
     * List every doctor (with profile + auth-service name/email) for the admin.
     * Used by /admin/doctors tab to show "all" doctors regardless of approval.
     */
    @GetMapping("/doctors/all")
    public ResponseEntity<Map<String, Object>> getAllDoctors() {
        if (isNotAdmin()) return forbidden();
        List<Map<String, Object>> enriched = enrichDoctors(doctorRepo.findAll());
        return ResponseEntity.ok(Map.of("success", true, "data", enriched));
    }

    /**
     * Pending-approval doctors only (admin-only).
     */
    @GetMapping("/doctors/pending")
    public ResponseEntity<Map<String, Object>> getPendingDoctors() {
        if (isNotAdmin()) return forbidden();
        List<DoctorProfile> all = doctorRepo.findAll();
        List<DoctorProfile> pending = new ArrayList<>();
        for (DoctorProfile d : all) {
            if (Boolean.FALSE.equals(d.getApproval())) {
                pending.add(d);
            }
        }
        return ResponseEntity.ok(Map.of("success", true, "data", enrichDoctors(pending)));
    }

    /**
     * Approved doctors only (admin-only) — returns the same shape as patient
     * /user/doctors but always reachable for admin regardless of role gating.
     */
    @GetMapping("/doctors/approved")
    public ResponseEntity<Map<String, Object>> getApprovedDoctors() {
        if (isNotAdmin()) return forbidden();
        List<Map<String, Object>> enriched = enrichDoctors(doctorRepo.findByApprovalTrue());
        return ResponseEntity.ok(Map.of("success", true, "data", enriched));
    }

    /**
     * All non-admin users (patients + pharmacists + doctors) — admin-only.
     */
    @GetMapping("/users")
    @SuppressWarnings("rawtypes")
    public ResponseEntity<Map<String, Object>> getAllUsers() {
        if (isNotAdmin()) return forbidden();

        HttpHeaders headers = forwardedAuthHeader();
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    "http://localhost:8001/api/v1/internal/all-users",
                    HttpMethod.GET,
                    requestEntity,
                    Map.class
            );
            Map<?, ?> body = response.getBody();
            if (body != null && body.containsKey("data")) {
                return ResponseEntity.ok(Map.of("success", true, "data", body.get("data")));
            }
            return ResponseEntity.ok(Map.of("success", true, "data", List.of()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "message", "Unable to fetch users: " + e.getMessage()
            ));
        }
    }

    /**
     * Change a user's role — admin-only. Forwards to authservice which owns
     * the canonical user record.
     */
    @PatchMapping("/users/{id}/role")
    @SuppressWarnings("rawtypes")
    public ResponseEntity<Map<String, Object>> changeUserRole(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        if (isNotAdmin()) return forbidden();
        Object newRole = payload.get("role");
        if (newRole == null) {
            return ResponseEntity.status(400).body(Map.of("success", false, "message", "Missing field: 'role'."));
        }

        HttpHeaders headers = forwardedAuthHeader();
        headers.set("Content-Type", "application/json");
        HttpEntity<Map<String, Object>> req = new HttpEntity<>(Map.of("role", String.valueOf(newRole)), headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    "http://localhost:8001/api/v1/internal/users/" + id + "/role",
                    HttpMethod.PATCH,
                    req,
                    Map.class
            );
            Map<?, ?> body = response.getBody();
            if (body != null) {
                @SuppressWarnings("unchecked") Map<String, Object> cast = (Map<String, Object>) body;
                return ResponseEntity.ok(cast);
            }
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "message", "Unable to update role: " + e.getMessage()
            ));
        }
    }

    /**
     * Delete a user — admin-only. Forwards to authservice.
     */
    @DeleteMapping("/users/{id}")
    @SuppressWarnings("rawtypes")
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable String id) {
        if (isNotAdmin()) return forbidden();

        HttpHeaders headers = forwardedAuthHeader();
        HttpEntity<Void> req = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    "http://localhost:8001/api/v1/internal/users/" + id,
                    HttpMethod.DELETE,
                    req,
                    Map.class
            );
            Map<?, ?> body = response.getBody();
            if (body != null) {
                @SuppressWarnings("unchecked") Map<String, Object> cast = (Map<String, Object>) body;
                return ResponseEntity.ok(cast);
            }
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "message", "Unable to delete user: " + e.getMessage()
            ));
        }
    }

    /* ---------- helpers ---------- */

    private HttpHeaders forwardedAuthHeader() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        HttpHeaders headers = new HttpHeaders();
        if (attrs != null && attrs.getRequest().getHeader("Authorization") != null) {
            headers.set("Authorization", attrs.getRequest().getHeader("Authorization"));
        }
        return headers;
    }

    @SuppressWarnings("rawtypes")
    private List<Map<String, Object>> enrichDoctors(List<DoctorProfile> doctors) {
        HttpHeaders headers = forwardedAuthHeader();
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        List<Map<String, Object>> out = new ArrayList<>();
        for (DoctorProfile d : doctors) {
            Map<String, Object> row = doctorToMap(d);
            String doctorName = "Unknown Doctor";
            String doctorEmail = "";
            try {
                ResponseEntity<Map> response = restTemplate.exchange(
                        "http://localhost:8001/api/v1/auth/user/" + d.getUserId(),
                        HttpMethod.GET,
                        requestEntity,
                        Map.class
                );
                Map<?, ?> body = response.getBody();
                if (body != null && body.containsKey("data")) {
                    Map<?, ?> nested = (Map<?, ?>) body.get("data");
                    if (nested != null) {
                        if (nested.get("name") != null) doctorName = String.valueOf(nested.get("name"));
                        if (nested.get("email") != null) doctorEmail = String.valueOf(nested.get("email"));
                    }
                }
            } catch (Exception ignored) {
                // keep defaults
            }
            row.put("name", doctorName);
            row.put("email", doctorEmail);
            out.add(row);
        }
        return out;
    }

    private Map<String, Object> doctorToMap(DoctorProfile d) {
        Map<String, Object> m = new HashMap<>();
        m.put("doctorId", d.getUserId());
        m.put("specialization", d.getSpecialization() != null ? d.getSpecialization() : "");
        m.put("qualification", d.getQualification() != null ? d.getQualification() : "");
        m.put("location", d.getLocation() != null ? d.getLocation() : "");
        m.put("visiting_fee", d.getVisitingFee());
        m.put("rating", d.getRating());
        m.put("approval", d.getApproval());
        return m;
    }
}