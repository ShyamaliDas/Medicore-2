package service.userservice.userservice.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "appointments")
@Data 
@NoArgsConstructor 
@AllArgsConstructor 
@Builder
public class Appointment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long serialNo;

    private String patientId;
    private String patientName;
    private String patientPhone;
    private String doctorId;
    private String doctorName;

    // THIS IS THE EXACT LINE THAT FIXES THE DATABASE CRASH 👇
    @Column(name = "appointment_date")
    private String date;

    // Per-(doctor, date) slot number — restarts at 1 for every doctor on every
    // new day. The global `serialNo` above stays as the surrogate PK; `slotNo`
    // is what the patient/doctor sees as "your serial for the day".
    @Column(name = "slot_no")
    private Integer slotNo;

    private String symptoms;
    private String transactionId;
    private Boolean isComplete;
}