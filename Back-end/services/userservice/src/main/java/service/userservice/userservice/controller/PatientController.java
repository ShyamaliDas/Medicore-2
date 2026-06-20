package service.userservice.userservice.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import service.userservice.userservice.context.UserContext;
import service.userservice.userservice.model.Appointment;
import service.userservice.userservice.model.DoctorProfile;
import service.userservice.userservice.model.Prescription;
import service.userservice.userservice.repository.AppointmentRepository;
import service.userservice.userservice.repository.DoctorProfileRepository;
import service.userservice.userservice.repository.PrescriptionRepository;

@RestController @RequestMapping("/api/v1/patient")
public class PatientController {
    @Autowired private AppointmentRepository apptRepo;
    @Autowired private PrescriptionRepository prescRepo;
    @Autowired private DoctorProfileRepository docRepo;

    @PostMapping("/appointments")
    public ResponseEntity<?> bookAppointment(@RequestBody Map<String, Object> payload) {
        String doctorId = (String) payload.get("doctor_id");
        
        Appointment appt = Appointment.builder()
                .patientId(UserContext.getUserId())
                .patientName(UserContext.getName())   // From JWT
                .patientPhone(UserContext.getPhone()) // From JWT
                .doctorId(doctorId)
                .date((String) payload.get("date"))
                .symptoms((String) payload.get("symptoms"))
                .transactionId((String) payload.get("transaction_id"))
                .isComplete(false).build();
        apptRepo.save(appt);

        Prescription presc = Prescription.builder()
                .patientId(appt.getPatientId())
                .doctorId(appt.getDoctorId())
                .symptoms(appt.getSymptoms())
                .transactionId(appt.getTransactionId()).build();
        prescRepo.save(presc);

        DoctorProfile docProfile = docRepo.findById(doctorId).orElse(new DoctorProfile());

        return ResponseEntity.status(201).body(Map.of(
            "success", true, 
            "message", "Appointment booked successfully.", 
            "data", Map.of(
                "prescriptionID", presc.getPrescriptionId(),
                "patient_id", appt.getPatientId(),
                "doctor_info", Map.of("doctorId", doctorId, "specialization", docProfile.getSpecialization() != null ? docProfile.getSpecialization() : ""),
                "location", docProfile.getLocation() != null ? docProfile.getLocation() : "",
                "date", appt.getDate(),
                "serial_no", appt.getSerialNo(),
                "symptoms", appt.getSymptoms()
            )
        ));
    }

    @GetMapping("/prescriptions")
    public ResponseEntity<?> getPrescriptions() {
        return ResponseEntity.ok(Map.of("success", true, "data", prescRepo.findByPatientId(UserContext.getUserId())));
    }

    @GetMapping("/prescriptions/doctor/{doctorId}")
    public ResponseEntity<?> getPrescriptionsByDoctor(@PathVariable String doctorId) {
        return ResponseEntity.ok(Map.of("success", true, "data", prescRepo.findByPatientIdAndDoctorId(UserContext.getUserId(), doctorId)));
    }
}