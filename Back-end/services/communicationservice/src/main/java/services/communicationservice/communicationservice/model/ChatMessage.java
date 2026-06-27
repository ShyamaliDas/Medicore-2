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

    /**
     * The userId of whoever sent the message (doctor or patient).
     * Used by the frontend to decide whether a bubble is "mine" or
     * "theirs" — without this, the doctor always sees every message
     * on the right (his) side because both messages reference the
     * same patientId.
     */
    private String senderId;

    @Column(columnDefinition = "TEXT")
    private String message;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("updated_at")
    private String updatedAt;
}