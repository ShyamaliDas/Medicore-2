package service.bloodbankservice.bloodbankservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import service.bloodbankservice.bloodbankservice.context.UserContext;
import service.bloodbankservice.bloodbankservice.model.BloodBankDonor;
import service.bloodbankservice.bloodbankservice.repository.BloodBankRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/bloodbank")
public class BloodBankController {

    @Autowired 
    private BloodBankRepository donorRepo;

    private boolean isNotPatient() {
        return !"patient".equalsIgnoreCase(UserContext.getRole());
    }

    private ResponseEntity<Map<String, Object>> forbiddenResponse() {
        return ResponseEntity.status(403).body(Map.of(
            "success", false, 
            "message", "Forbidden: Only patients can access or modify this donor resource."
        ));
    }

    @PostMapping("/donor/register")
    public ResponseEntity<?> registerDonor(@RequestBody Map<String, String> payload) {
        if (isNotPatient()) return forbiddenResponse();

        String donorId = UserContext.getUserId();
        
        // Prevent registering a single patient multiple times
        if (donorRepo.findByDonorId(donorId).isPresent()) {
            return ResponseEntity.status(400).body(Map.of(
                "success", false, 
                "message", "Bad Request: User is already registered as a donor."
            ));
        }

        // Handle structural defaults fallback for missing claims safely
        String bloodGroup = UserContext.getBloodGroup() != null ? UserContext.getBloodGroup() : "O+";
        String phone = UserContext.getPhone() != null ? UserContext.getPhone() : "Unknown";

        BloodBankDonor donor = BloodBankDonor.builder()
                .bloodBankId("bb_donor_" + UUID.randomUUID().toString().substring(0, 4))
                .donorId(donorId)
                .name(UserContext.getName())
                .contactNo(phone)
                .bloodgroup(bloodGroup)
                .lastdate(payload.get("lastdate"))
                .build();

        donorRepo.save(donor);

        return ResponseEntity.status(201).body(Map.of(
            "success", true,
            "message", "Donor profile registered successfully.",
            "data", donor
        ));
    }

    @GetMapping("/donors")
    public ResponseEntity<?> getDonorsByBloodGroup(@RequestParam String bloodGroup) {
        List<BloodBankDonor> matches = donorRepo.findByBloodgroup(bloodGroup);

        // Filter: Keep only those whose last donation date is older than 3 months
        LocalDate threeMonthsAgo = LocalDate.now().minusMonths(3);

        List<BloodBankDonor> eligibleDonors = matches.stream().filter(donor -> {
            if (donor.getLastdate() == null || donor.getLastdate().isBlank() || donor.getLastdate().equalsIgnoreCase("N/A")) {
                return true; // Never donated before
            }
            try {
                LocalDate lastDonation = LocalDate.parse(donor.getLastdate());
                return lastDonation.isBefore(threeMonthsAgo);
            } catch (Exception e) {
                return true; // If parsing fails, fall back to showing the entry
            }
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "bloodgroup_filtered", bloodGroup,
            "data", eligibleDonors
        ));
    }

    @PutMapping("/donor/update-date")
    public ResponseEntity<?> updateDonationDate(@RequestBody Map<String, String> payload) {
        if (isNotPatient()) return forbiddenResponse();

        String donorId = UserContext.getUserId();
        String newDate = payload.get("lastdate");

        if (newDate == null || newDate.isBlank()) {
            return ResponseEntity.status(400).body(Map.of("success", false, "message", "Missing field: 'lastdate' is required."));
        }

        return donorRepo.findByDonorId(donorId).map(donor -> {
            donor.setLastdate(newDate);
            donorRepo.save(donor);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Donor last donation date updated successfully.",
                "data", donor
            ));
        }).orElse(ResponseEntity.status(404).body(Map.of(
            "success", false, 
            "message", "Donor profile record not found for this patient."
        )));
    }
}