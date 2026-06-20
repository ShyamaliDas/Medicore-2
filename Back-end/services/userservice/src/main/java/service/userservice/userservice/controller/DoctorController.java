package service.userservice.userservice.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import service.userservice.userservice.context.UserContext;
import service.userservice.userservice.model.Appointment;
import service.userservice.userservice.model.Prescription;
import service.userservice.userservice.repository.AppointmentRepository;
import service.userservice.userservice.repository.PrescriptionRepository;

@RestController @RequestMapping("/api/v1/doctor")
public class DoctorController {
    @Autowired private AppointmentRepository apptRepo;
    @Autowired private PrescriptionRepository prescRepo;

    @PutMapping("/prescriptions/{id}")
    public ResponseEntity<?> writePrescription(@PathVariable String id, @RequestBody Prescription payload) {
        return prescRepo.findById(id).map(p -> {
            p.setDescription(payload.getDescription());
            p.setMedicineDetails(payload.getMedicineDetails());
            prescRepo.save(p);
            
            // Optionally, mark appointment as complete here
            return ResponseEntity.ok(Map.of("success", true, "message", "Prescription successfully issued.", "data", p));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Prescription slot not found.")));
    }

    @GetMapping("/prescriptions/patient/{patientId}")
    public ResponseEntity<?> getPatientHistory(@PathVariable String patientId) {
        return ResponseEntity.ok(Map.of("success", true, "data", prescRepo.findByDoctorIdAndPatientId(UserContext.getUserId(), patientId)));
    }

    @GetMapping("/appointments")
    public ResponseEntity<?> getAppointments() {
        List<Appointment> all = apptRepo.findByDoctorId(UserContext.getUserId());
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
                "incomplete", all.stream().filter(a -> !a.getIsComplete()).map(this::mapAppointmentResponse).collect(Collectors.toList()),
                "complete", all.stream().filter(Appointment::getIsComplete).map(this::mapAppointmentResponse).collect(Collectors.toList())
        )));
    }

    private Map<String, Object> mapAppointmentResponse(Appointment a) {
        return Map.of(
            "serial_no", a.getSerialNo(),
            "date", a.getDate(),
            "patient_id", a.getPatientId(),
            "name", a.getPatientName() != null ? a.getPatientName() : "Unknown",
            "phone", a.getPatientPhone() != null ? a.getPatientPhone() : "Unknown",
            "symptoms", a.getSymptoms()
        );
    }
}