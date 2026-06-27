package service.userservice.userservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import service.userservice.userservice.context.UserContext;
import service.userservice.userservice.model.Appointment;
import service.userservice.userservice.model.Prescription;
import service.userservice.userservice.repository.AppointmentRepository;
import service.userservice.userservice.repository.PrescriptionRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController 
@RequestMapping("/api/v1/doctor")
public class DoctorController {
    
    @Autowired private AppointmentRepository apptRepo;
    @Autowired private PrescriptionRepository prescRepo;

    /**
     * Helper method to validate if the user is actually a doctor.
     */
    private boolean isNotDoctor() {
        return !"doctor".equalsIgnoreCase(UserContext.getRole());
    }

    /**
     * Helper method to generate the standard Forbidden error response.
     */
    private ResponseEntity<Map<String, Object>> forbiddenResponse() {
        return ResponseEntity.status(403).body(Map.of(
            "success", false, 
            "message", "Forbidden: Only doctors can access this resource."
        ));
    }

    @GetMapping("/prescriptions/{id}")
    public ResponseEntity<?> getPrescription(@PathVariable String id) {
        // 1. Role Validation
        if (isNotDoctor()) return forbiddenResponse();

        // 2. Process Request
        return prescRepo.findById(id)
                .<ResponseEntity<?>>map(p -> ResponseEntity.ok(Map.of(
                        "success", true,
                        "data", p
                )))
                .orElse(ResponseEntity.status(404).body(Map.of(
                        "success", false,
                        "message", "Prescription not found."
                )));
    }

    @PutMapping("/appointments/{serialNo}/complete")
    public ResponseEntity<?> completeAppointment(@PathVariable Long serialNo) {
        // 1. Role Validation
        if (isNotDoctor()) return forbiddenResponse();

        // 2. Process Request
        return apptRepo.findById(serialNo).<ResponseEntity<?>>map(a -> {
            a.setIsComplete(true);
            apptRepo.save(a);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Appointment marked complete.",
                    "data", a
            ));
        }).orElse(ResponseEntity.status(404).body(Map.of(
                "success", false,
                "message", "Appointment not found."
        )));
    }

    @PutMapping("/prescriptions/{id}")
    public ResponseEntity<?> writePrescription(@PathVariable String id, @RequestBody Prescription payload) {
        // 1. Role Validation
        System.out.println(payload);
        if (isNotDoctor()) return forbiddenResponse();

        // 2. Process Request
        return prescRepo.findById(id).map(p -> {
            System.out.println(p.getMedicineDetails());
            p.setDescription(payload.getDescription());
            p.setMedicineDetails(payload.getMedicineDetails());
            prescRepo.save(p);
            
            return ResponseEntity.ok(Map.of(
                "success", true, 
                "message", "Prescription successfully issued.", 
                "data", p
            ));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Prescription slot not found.")));
    }

    @GetMapping("/prescriptions/patient/{patientId}")
    public ResponseEntity<?> getPatientHistory(@PathVariable String patientId) {
        // 1. Role Validation
        if (isNotDoctor()) return forbiddenResponse();

        // 2. Process Request
        return ResponseEntity.ok(Map.of(
            "success", true, 
            "data", prescRepo.findByDoctorIdAndPatientId(UserContext.getUserId(), patientId)
        ));
    }

    @GetMapping("/appointments")
    public ResponseEntity<?> getAppointments() {
        // 1. Role Validation
        if (isNotDoctor()) return forbiddenResponse();

        // 2. Process Request
        String doctorId = UserContext.getUserId();
        List<Appointment> all = apptRepo.findByDoctorId(doctorId);

        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
                "incomplete", all.stream().filter(a -> !a.getIsComplete()).map(a -> mapAppointmentResponse(a, doctorId)).collect(Collectors.toList()),
                "complete", all.stream().filter(Appointment::getIsComplete).map(a -> mapAppointmentResponse(a, doctorId)).collect(Collectors.toList())
        )));
    }

    /**
     * Build a per-appointment JSON row. Includes prescriptionID (the
     * slot created when the patient booked the appointment) so the
     * doctor's "Prescribe" link can navigate to /doctor/prescriptions/{id}
     * instead of failing with prescriptionId undefined.
     */
    private Map<String, Object> mapAppointmentResponse(Appointment a, String doctorId) {
        Map<String, Object> row = new java.util.HashMap<>();
        // Per-(doctor, date) slot number. The global PK stays as serialNo
        // so /doctor/appointments/{serialNo}/complete keeps working.
        int daySlot = a.getSlotNo() != null ? a.getSlotNo() : 0;
        row.put("serial_no", daySlot);
        row.put("slot_no", daySlot);
        row.put("serialNo", a.getSerialNo());
        row.put("time", PatientController.computeSlotTime(daySlot));
        row.put("date", a.getDate());
        row.put("patient_id", a.getPatientId());
        row.put("name", a.getPatientName() != null ? a.getPatientName() : "Unknown");
        row.put("phone", a.getPatientPhone() != null ? a.getPatientPhone() : "Unknown");
        row.put("symptoms", a.getSymptoms());

        String prescriptionId = prescRepo
                .findByDoctorIdAndPatientId(doctorId, a.getPatientId())
                .stream()
                .filter(p -> p.getSymptoms() != null && p.getSymptoms().equals(a.getSymptoms()))
                .filter(p -> p.getTransactionId() != null && p.getTransactionId().equals(a.getTransactionId()))
                .map(p -> p.getPrescriptionId())
                .findFirst()
                .orElse(null);
        row.put("prescriptionID", prescriptionId);
        return row;
    }
}