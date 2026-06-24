package service.userservice.userservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "doctor_profiles")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class DoctorProfile {
    @Id @Column(name = "user_id") private String userId;
    
    @Transient private String name; // Fetched from token/auth-service context
    
    private String specialization;
    private String qualification;
    private String location;
    private Double visitingFee;
    private Double rating;
    @Builder.Default private Boolean approval = false;
    private LocalDateTime updatedAt;
    
    @PreUpdate @PrePersist protected void onUpdate() { this.updatedAt = LocalDateTime.now(); }
}