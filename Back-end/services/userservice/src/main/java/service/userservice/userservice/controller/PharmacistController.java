package service.userservice.userservice.controller;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import service.userservice.userservice.model.Appointment;
import service.userservice.userservice.model.Medicine;
import service.userservice.userservice.model.Prescription;
import service.userservice.userservice.repository.AppointmentRepository;
import service.userservice.userservice.repository.MedicineRepository;
import service.userservice.userservice.repository.PrescriptionRepository;

@RestController
@RequestMapping("/api/v1/pharmacist")
public class PharmacistController {

    @Autowired private MedicineRepository medRepo;
    @Autowired private PrescriptionRepository prescRepo;
    @Autowired private AppointmentRepository apptRepo;
    @Autowired private RestTemplate restTemplate;

    // ── Inventory ─────────────────────────────────────────────────────────

    @GetMapping("/medicines")
    public ResponseEntity<?> getAllMedicines() {
        return ResponseEntity.ok(Map.of("success", true, "data", medRepo.findAll()));
    }

    @PostMapping("/medicines")
    public ResponseEntity<?> addMedicine(@RequestBody Medicine medicine) {
        if (medicine.getMedicineName() == null || medicine.getMedicineName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Medicine name cannot be null or empty."
            ));
        }
        Medicine saved = medRepo.save(medicine);
        return ResponseEntity.status(201).body(Map.of(
            "success", true,
            "message", "Medicine added successfully to catalog.",
            "data", saved
        ));
    }

    @PutMapping("/medicines/{id}")
    public ResponseEntity<?> updateMedicineStock(@PathVariable String id, @RequestBody Medicine payload) {
        return medRepo.findById(id).map(m -> {
            if (payload.getMedicineName() != null && !payload.getMedicineName().trim().isEmpty()) {
                m.setMedicineName(payload.getMedicineName().trim());
            }
            if (payload.getPrice() != null)     m.setPrice(payload.getPrice());
            if (payload.getQuantity() != null)  m.setQuantity(payload.getQuantity());
            if (payload.getCategory() != null && !payload.getCategory().trim().isEmpty()) {
                m.setCategory(payload.getCategory().trim());
            }
            if (payload.getManufacturer() != null && !payload.getManufacturer().trim().isEmpty()) {
                m.setManufacturer(payload.getManufacturer().trim());
            }
            if (payload.getExpiryDate() != null && !payload.getExpiryDate().trim().isEmpty()) {
                m.setExpiryDate(payload.getExpiryDate().trim());
            }
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Medicine inventory details altered successfully.",
                "data", medRepo.save(m)
            ));
        }).orElse(ResponseEntity.status(404).body(Map.of(
            "success", false,
            "message", "Medicine not found."
        )));
    }

    // ── Search Prescription ───────────────────────────────────────────────
    //
    // The pharmacist types a patient's email. We resolve it to a userId via
    // the auth service, then return the most-recent (last) prescription's
    // medicine details with dose + duration.

    @GetMapping("/prescriptions/search")
    public ResponseEntity<?> searchPrescription(@RequestParam("email") String email) {
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Patient email is required."
            ));
        }

        // 1. Resolve email → userId by calling auth-service.
        String patientId;
        try {
            @SuppressWarnings("rawtypes")
            ResponseEntity<Map> resp = restTemplate.getForEntity(
                "http://localhost:8001/api/v1/auth/email/" + email.trim(),
                Map.class
            );
            @SuppressWarnings("unchecked")
            Map<String, Object> body = resp.getBody();
            if (body == null || !Boolean.TRUE.equals(body.get("success"))) {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "No patient found with email " + email.trim() + "."
                ));
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) body.get("data");
            if (data == null || data.get("userId") == null) {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "No patient found with email " + email.trim() + "."
                ));
            }
            patientId = String.valueOf(data.get("userId"));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of(
                "success", false,
                "message", "No patient found with email " + email.trim() + "."
            ));
        }

        // 2. Pull the patient's appointments, pick the most recent by serial_no.
        //    Then match its transaction_id to the corresponding prescription
        //    (the prescription was created in the same booking flow).
        List<Appointment> appts = apptRepo.findByPatientId(patientId);
        if (appts == null || appts.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                "success", false,
                "message", "No prescriptions on file for " + email.trim() + "."
            ));
        }

        Appointment latestAppt = appts.stream()
                .max(Comparator.comparing(
                    Appointment::getSerialNo,
                    Comparator.nullsLast(Comparator.naturalOrder())
                ))
                .orElse(appts.get(0));

        String txId = latestAppt.getTransactionId();
        List<Prescription> list = prescRepo.findByPatientId(patientId);
        Prescription last = (list == null ? List.<Prescription>of() : list).stream()
                .filter(p -> p.getTransactionId() != null
                          && p.getTransactionId().equals(txId))
                .findFirst()
                .orElse(list != null && !list.isEmpty()
                        ? list.get(list.size() - 1)
                        : null);

        if (last == null) {
            return ResponseEntity.status(404).body(Map.of(
                "success", false,
                "message", "No prescriptions on file for " + email.trim() + "."
            ));
        }

        // 3. Shape a response with patient info + last prescription + medicines.
        Map<String, Object> data = new HashMap<>();
        data.put("patient_id", patientId);
        data.put("prescription_id", last.getPrescriptionId());
        data.put("doctor_id", last.getDoctorId());
        data.put("symptoms", last.getSymptoms());
        data.put("description", last.getDescription());
        data.put("transaction_id", last.getTransactionId());
        data.put("medicines", last.getMedicineDetails());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Last prescription found.",
            "data", data
        ));
    }
}