package service.userservice.userservice.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import service.userservice.userservice.repository.DoctorProfileRepository;

@RestController @RequestMapping("/api/v1/admin")
public class AdminController {
    @Autowired private DoctorProfileRepository doctorRepo;

    @PatchMapping("/approve-doctor/{id}")
    public ResponseEntity<?> approveDoctor(@PathVariable String id) {
        return doctorRepo.findById(id).map(doc -> {
            doc.setApproval(true);
            doctorRepo.save(doc);
            return ResponseEntity.ok(Map.of(
                "success", true, 
                "message", "Doctor status has been updated to Approved.", 
                "data", Map.of(
                    "doctorId", doc.getUserId(),
                    "role", "doctor",
                    "approval", true,
                    "updatedAt", doc.getUpdatedAt()
                )
            ));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Doctor not found.")));
    }
}