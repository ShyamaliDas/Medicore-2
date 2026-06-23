package service.userservice.userservice.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import service.userservice.userservice.context.UserContext;
import service.userservice.userservice.repository.DoctorProfileRepository;

@RestController
@RequestMapping("/api/v1/user/admin/dashboard")
public class AdminDashboardController {

    @Autowired
    private DoctorProfileRepository doctorRepo;

    @Autowired
    private RestTemplate restTemplate;

    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats() {
        if (!"admin".equalsIgnoreCase(UserContext.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "Admin access required."
            ));
        }

        try {
            Map<?, ?> authResponse = restTemplate.getForObject(
                    "http://localhost:8001/api/v1/internal/user-stats",
                    Map.class
            );

            if (authResponse == null || !authResponse.containsKey("data")) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                        "success", false,
                        "message", "Unable to fetch user statistics."
                ));
            }

            Map<?, ?> roleCounts = (Map<?, ?>) authResponse.get("data");
            long patients = toLong(roleCounts.get("patients"));
            long pharmacists = toLong(roleCounts.get("pharmacists"));
            long totalDoctors = toLong(roleCounts.get("doctors"));
            long doctorsApproved = doctorRepo.countByApprovalTrue();
            long doctorsPending = Math.max(totalDoctors - doctorsApproved, 0);
            long totalUsers = patients + pharmacists + totalDoctors;

            Map<String, Object> breakdown = new HashMap<>();
            breakdown.put("patients", patients);
            breakdown.put("doctors_approved", doctorsApproved);
            breakdown.put("doctors_pending", doctorsPending);
            breakdown.put("pharmacists", pharmacists);

            Map<String, Object> data = new HashMap<>();
            data.put("total_users", totalUsers);
            data.put("breakdown", breakdown);

            return ResponseEntity.ok(Map.of("success", true, "data", data));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "message", "Unable to fetch user statistics: " + e.getMessage()
            ));
        }
    }

    private long toLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return 0L;
    }
}
