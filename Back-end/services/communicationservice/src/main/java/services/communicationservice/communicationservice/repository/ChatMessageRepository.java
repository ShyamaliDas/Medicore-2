package services.communicationservice.communicationservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import services.communicationservice.communicationservice.model.ChatMessage;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {
    // Fetches messages in descending order (newest first)
    List<ChatMessage> findByDoctorIdAndPatientIdOrderByCreatedAtDesc(String doctorId, String patientId);
}