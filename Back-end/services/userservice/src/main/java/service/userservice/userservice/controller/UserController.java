package service.userservice.userservice.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import service.userservice.userservice.context.UserContext;
import service.userservice.userservice.model.DoctorProfile;
import service.userservice.userservice.model.PharmacistProfile;
import service.userservice.userservice.repository.DoctorProfileRepository;
import service.userservice.userservice.repository.PharmacistProfileRepository;


@RestController 
@RequestMapping("/api/v1/user")
public class UserController {
    
    @Autowired private DoctorProfileRepository doctorRepo;
    @Autowired private PharmacistProfileRepository pharmRepo;
    @Autowired private RestTemplate restTemplate;

    /**
     * Loads the currently-authenticated doctor/pharmacist's saved profile.
     * Frontend calls this on /doctor/profile and /pharmacist/profile mount
     * so the form hydrates with existing values instead of looking empty.
     *
     * Returns 404 when the caller is a doctor/pharmacist who has never
     * pressed Save yet (no profile row) — the frontend treats that as a
     * fresh signup and shows the empty form, no error banner.
     */
    @GetMapping("/profile")
    public ResponseEntity<?> getMyProfile() {
        String role = UserContext.getRole();
        String userId = UserContext.getUserId();

        if ("doctor".equalsIgnoreCase(role)) {
            return doctorRepo.findById(userId)
                    .<ResponseEntity<?>>map(p -> ResponseEntity.ok(Map.of(
                            "success", true,
                            "data", Map.of(
                                    "userId",         p.getUserId(),
                                    "specialization", p.getSpecialization() != null ? p.getSpecialization() : "",
                                    "qualification",  p.getQualification() != null ? p.getQualification() : "",
                                    "location",       p.getLocation() != null ? p.getLocation() : "",
                                    "visiting_fee",   p.getVisitingFee(),
                                    "rating",         p.getRating(),
                                    "approval",       p.getApproval()
                            )
                    )))
                    .orElse(ResponseEntity.status(404).body(Map.of(
                            "success", false,
                            "message", "No doctor profile found. Save your details to create one."
                    )));
        }

        if ("pharmacist".equalsIgnoreCase(role)) {
            return pharmRepo.findById(userId)
                    .<ResponseEntity<?>>map(p -> ResponseEntity.ok(Map.of(
                            "success", true,
                            "data", Map.of(
                                    "userId",        p.getUserId(),
                                    "pharmacy_name", p.getPharmacyName() != null ? p.getPharmacyName() : ""
                            )
                    )))
                    .orElse(ResponseEntity.status(404).body(Map.of(
                            "success", false,
                            "message", "No pharmacist profile found. Save your details to create one."
                    )));
        }

        return ResponseEntity.status(403).body(Map.of(
                "success", false,
                "message", "Forbidden: Only doctors and pharmacists have profiles."
        ));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> payload) {
        String role = UserContext.getRole();
        String userId = UserContext.getUserId();

        if ("doctor".equalsIgnoreCase(role)) {
            DoctorProfile doc = doctorRepo.findById(userId).orElse(new DoctorProfile());
            doc.setUserId(userId);
            if (payload.containsKey("specialization")) doc.setSpecialization((String) payload.get("specialization"));
            if (payload.containsKey("qualification")) doc.setQualification((String) payload.get("qualification"));
            if (payload.containsKey("location")) doc.setLocation((String) payload.get("location"));
            if (payload.containsKey("visiting_fee")) doc.setVisitingFee(Double.valueOf(payload.get("visiting_fee").toString()));
            if (doc.getRating() == null) doc.setRating(5.0);
            
            DoctorProfile saved = doctorRepo.save(doc);
            
            Map<String, Object> data = new HashMap<>();
            data.put("userId", saved.getUserId());
            data.put("role", role);
            data.put("specialization", saved.getSpecialization());
            data.put("rating", saved.getRating());
            data.put("qualification", saved.getQualification());
            data.put("location", saved.getLocation());
            data.put("visiting_fee", saved.getVisitingFee());
            data.put("updatedAt", saved.getUpdatedAt());
            
            return ResponseEntity.ok(Map.of("success", true, "message", "Profile updated successfully.", "data", data));
        } else if ("pharmacist".equalsIgnoreCase(role)) {
            PharmacistProfile pharm = pharmRepo.findById(userId).orElse(new PharmacistProfile());
            pharm.setUserId(userId);
            if (payload.containsKey("pharmacy_name")) pharm.setPharmacyName((String) payload.get("pharmacy_name"));
            return ResponseEntity.ok(Map.of("success", true, "message", "Profile updated successfully.", "data", pharmRepo.save(pharm)));
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Role profile logged with no extra fields required."));
    }

    @GetMapping("/doctors")
    public ResponseEntity<?> getApprovedDoctors() {
        List<DoctorProfile> approvedDoctors = doctorRepo.findByApprovalTrue();
        List<Map<String, Object>> enrichedDoctors = enrichDoctors(approvedDoctors);
        return ResponseEntity.ok(Map.of("success", true, "data", enrichedDoctors));
    }

    @GetMapping("/doctors/search")
    public ResponseEntity<?> searchDoctors(
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) String location) {
        if (isNotPatient()) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "message", "Forbidden: Only patients can search doctors."));
        }

        String specFilter = normalizeFilter(specialization);
        String locFilter = normalizeFilter(location);

        List<DoctorProfile> doctors = doctorRepo.searchApprovedDoctors(specFilter, locFilter);
        List<Map<String, Object>> enrichedDoctors = enrichDoctors(doctors);

        Map<String, Object> filtersApplied = new HashMap<>();
        filtersApplied.put("specialization", specFilter);
        filtersApplied.put("location", locFilter);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("filters_applied", filtersApplied);
        response.put("data", enrichedDoctors);

        return ResponseEntity.ok(response);
    }

    private boolean isNotPatient() {
        return !"patient".equalsIgnoreCase(UserContext.getRole());
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private List<Map<String, Object>> enrichDoctors(List<DoctorProfile> doctors) {
        String jwtToken = null;
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            jwtToken = request.getHeader("Authorization");
        }
        HttpHeaders headers = new HttpHeaders();
        if (jwtToken != null) {
            headers.set("Authorization", jwtToken);
        }
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);
        String finalJwtToken = jwtToken;

        return doctors.stream().map(doctor -> {
            Map<String, Object> docMap = new HashMap<>();
            docMap.put("doctorId", doctor.getUserId());
            docMap.put("specialization", doctor.getSpecialization());
            docMap.put("qualification", doctor.getQualification());
            docMap.put("location", doctor.getLocation());
            docMap.put("visiting_fee", doctor.getVisitingFee());
            docMap.put("rating", doctor.getRating());

            String doctorName = "Unknown Doctor";
            if (finalJwtToken != null) {
                try {
                    String authServiceUrl = "http://localhost:8001/api/v1/auth/user/" + doctor.getUserId();
                    ResponseEntity<Map> response = restTemplate.exchange(
                            authServiceUrl,
                            HttpMethod.GET,
                            requestEntity,
                            Map.class
                    );
                    Map<?, ?> responseBody = response.getBody();
                    if (responseBody != null && responseBody.containsKey("data")) {
                        Map<?, ?> nestedData = (Map<?, ?>) responseBody.get("data");
                        if (nestedData != null && nestedData.containsKey("name")) {
                            doctorName = (String) nestedData.get("name");
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Could not fetch name for userId " + doctor.getUserId() + ": " + e.getMessage());
                }
            }
            docMap.put("name", doctorName);
            return docMap;
        }).collect(Collectors.toList());
    }
}