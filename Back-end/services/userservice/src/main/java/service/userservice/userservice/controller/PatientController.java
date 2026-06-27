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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import service.userservice.userservice.context.UserContext;
import service.userservice.userservice.model.Appointment;
import service.userservice.userservice.model.DoctorProfile;
import service.userservice.userservice.model.Prescription;
import service.userservice.userservice.repository.AppointmentRepository;
import service.userservice.userservice.repository.DoctorProfileRepository;
import service.userservice.userservice.repository.PrescriptionRepository;

@RestController 
@RequestMapping("/api/v1/patient")
public class PatientController {
    
    @Autowired private AppointmentRepository apptRepo;
    @Autowired private PrescriptionRepository prescRepo;
    @Autowired private DoctorProfileRepository docRepo;
    @Autowired private RestTemplate restTemplate;

    /**
     * Helper method to validate if the user is actually a patient.
     */
    private boolean isNotPatient() {
        return !"patient".equalsIgnoreCase(UserContext.getRole());
    }

    @PostMapping("/appointments")
    public ResponseEntity<?> bookAppointment(@RequestBody Map<String, Object> payload) {
        try {
            // 1. Role Validation
            if (isNotPatient()) {
                return ResponseEntity.status(403).body(Map.of("success", false, "message", "Forbidden: Only patients can book appointments."));
            }

            // 2. Validate payload exists
            if (!payload.containsKey("doctor_id") || payload.get("doctor_id") == null) {
                return ResponseEntity.status(400).body(Map.of("success", false, "message", "Bad Request: 'doctor_id' is required."));
            }

            String doctorId = String.valueOf(payload.get("doctor_id"));
            
            // 3. Create Appointment
            Appointment appt = Appointment.builder()
                    .patientId(UserContext.getUserId())
                    .patientName(UserContext.getName())
                    .patientPhone(UserContext.getPhone())
                    .doctorId(doctorId)
                    .date(payload.get("date") != null ? String.valueOf(payload.get("date")) : "N/A")
                    .symptoms(payload.get("symptoms") != null ? String.valueOf(payload.get("symptoms")) : "N/A")
                    .transactionId(payload.get("transaction_id") != null ? String.valueOf(payload.get("transaction_id")) : "N/A")
                    .isComplete(false)
                    .build();
            
            apptRepo.save(appt);

            // 4. Create Prescription Shell
            Prescription presc = Prescription.builder()
                    .patientId(appt.getPatientId())
                    .doctorId(appt.getDoctorId())
                    .symptoms(appt.getSymptoms())
                    .transactionId(appt.getTransactionId())
                    .build();
                    
            prescRepo.save(presc);

            // 5. Fetch Doctor Profile
            DoctorProfile docProfile = docRepo.findById(doctorId).orElse(new DoctorProfile());

            // 6. Return Success Response
            return ResponseEntity.status(201).body(Map.of(
                "success", true, 
                "message", "Appointment booked successfully.", 
                "data", Map.of(
                    "prescriptionID", presc.getPrescriptionId(),
                    "patient_id", appt.getPatientId(),
                    "doctor_info", Map.of(
                            "doctorId", doctorId, 
                            "specialization", docProfile.getSpecialization() != null ? docProfile.getSpecialization() : ""
                    ),
                    "location", docProfile.getLocation() != null ? docProfile.getLocation() : "",
                    "date", appt.getDate(),
                    "serial_no", appt.getSerialNo(),
                    "symptoms", appt.getSymptoms()
                )
            ));

        } catch (Exception e) {
            // IF IT CRASHES NOW, POSTMAN WILL TELL YOU EXACTLY WHY!
            e.printStackTrace(); // This prints the error to your IDE console
            return ResponseEntity.status(500).body(Map.of(
                "success", false, 
                "message", "Server Error: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/myallappointments")
    public ResponseEntity<?> getMyAllAppointments() {
        if (isNotPatient()) {
            return ResponseEntity.status(403).body(Map.of(
                "success", false,
                "message", "Forbidden: Only patients can access this resource."
            ));
        }

        List<Map<String, Object>> appointments = apptRepo.findByPatientId(UserContext.getUserId())
                .stream()
                .map(this::mapPatientAppointmentResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("success", true, "data", appointments));
    }

    @GetMapping("/prescriptions")
    public ResponseEntity<?> getPrescriptions() {
        if (isNotPatient()) return ResponseEntity.status(403).body(Map.of("success", false, "message", "Forbidden"));
        return ResponseEntity.ok(Map.of("success", true, "data", prescRepo.findByPatientId(UserContext.getUserId())));
    }

    @GetMapping("/prescriptions/doctor/{doctorId}")
    public ResponseEntity<?> getPrescriptionsByDoctor(@PathVariable String doctorId) {
        if (isNotPatient()) return ResponseEntity.status(403).body(Map.of("success", false, "message", "Forbidden"));
        return ResponseEntity.ok(Map.of("success", true, "data", prescRepo.findByPatientIdAndDoctorId(UserContext.getUserId(), doctorId)));
    }

    private Map<String, Object> mapPatientAppointmentResponse(Appointment appointment) {
        DoctorProfile docProfile = docRepo.findById(appointment.getDoctorId()).orElse(new DoctorProfile());

        Map<String, Object> item = new HashMap<>();
        item.put("appointmentId", String.valueOf(appointment.getSerialNo()));
        item.put("doctorName", fetchDoctorName(appointment.getDoctorId()));
        item.put("department", docProfile.getSpecialization() != null ? docProfile.getSpecialization() : "");
        item.put("date", appointment.getDate());
        item.put("serialNo", appointment.getSerialNo());
        item.put("serial_no", appointment.getSerialNo());
        item.put("status", Boolean.TRUE.equals(appointment.getIsComplete()) ? "COMPLETED" : "CONFIRMED");
        return item;
    }

    private String fetchDoctorName(String doctorId) {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return "Unknown Doctor";
        }

        String jwtToken = attributes.getRequest().getHeader("Authorization");
        if (jwtToken == null) {
            return "Unknown Doctor";
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", jwtToken);
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    "http://localhost:8001/api/v1/auth/user/" + doctorId,
                    HttpMethod.GET,
                    requestEntity,
                    Map.class
            );
            Map<?, ?> responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("data")) {
                Map<?, ?> nestedData = (Map<?, ?>) responseBody.get("data");
                if (nestedData != null && nestedData.containsKey("name")) {
                    return (String) nestedData.get("name");
                }
            }
        } catch (Exception e) {
            System.err.println("Could not fetch name for doctorId " + doctorId + ": " + e.getMessage());
        }

        return "Unknown Doctor";
    }
}