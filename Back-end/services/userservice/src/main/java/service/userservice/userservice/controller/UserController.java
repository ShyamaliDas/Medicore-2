package service.userservice.userservice.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import service.userservice.userservice.context.UserContext;
import service.userservice.userservice.model.DoctorProfile;
import service.userservice.userservice.model.PharmacistProfile;
import service.userservice.userservice.repository.DoctorProfileRepository;
import service.userservice.userservice.repository.PharmacistProfileRepository;

@RestController @RequestMapping("/api/v1/user")
public class UserController {
    @Autowired private DoctorProfileRepository doctorRepo;
    @Autowired private PharmacistProfileRepository pharmRepo;

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
        // We fetch doctors, note that "name" will normally be joined from the auth-service in a true microservices setup, 
        // but here we return the profile data available in this db.
        List<DoctorProfile> approvedDoctors = doctorRepo.findByApprovalTrue();
        return ResponseEntity.ok(Map.of("success", true, "data", approvedDoctors));
    }
}