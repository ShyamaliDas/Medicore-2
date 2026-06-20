package service.userservice.userservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "doctor_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorProfile {

    @Id
    @Column(name = "user_id")
    private String userId; // Maps matching ID from Auth Token

    private String specialization;
    private String qualification;
    private String location;
    
    @Column(name = "visiting_fee")
    private Double visitingFee;

    private Double rating;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "approval")
    private Boolean approval = false;

    @PreUpdate
    @PrePersist
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}