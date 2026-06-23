package services.communicationservice.communicationservice.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "chat_messages")
@Data 
@NoArgsConstructor 
@AllArgsConstructor 
@Builder
public class ChatMessage {
    @Id 
    private String messageId;
    
    private String doctorId;
    private String patientId;
    
    @Column(columnDefinition = "TEXT")
    private String message;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("updated_at")
    private String updatedAt;
}