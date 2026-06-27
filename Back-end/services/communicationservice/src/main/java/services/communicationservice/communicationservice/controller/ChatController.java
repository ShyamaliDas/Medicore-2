package services.communicationservice.communicationservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import services.communicationservice.communicationservice.context.UserContext;
import services.communicationservice.communicationservice.model.ChatMessage;
import services.communicationservice.communicationservice.repository.ChatMessageRepository;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    @Autowired
    private ChatMessageRepository chatRepo;

    private boolean isInvalidRole() {
        String role = UserContext.getRole();
        return !"patient".equalsIgnoreCase(role) && !"doctor".equalsIgnoreCase(role);
    }

    private ResponseEntity<Map<String, Object>> forbiddenResponse() {
        return ResponseEntity.status(403).body(Map.of(
            "success", false,
            "message", "Forbidden: Access is denied. Only patients and doctors can interact here."
        ));
    }

    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, String> payload) {
        if (isInvalidRole()) return forbiddenResponse();

        String doctorId = payload.get("doctorId");
        String patientId = payload.get("patientId");
        String textMessage = payload.get("message");

        if (doctorId == null || patientId == null || textMessage == null || textMessage.isBlank()) {
            return ResponseEntity.status(400).body(Map.of(
                "success", false,
                "message", "Bad Request: Missing required parameters ('doctorId', 'patientId', 'message')."
            ));
        }

        String timestamp = Instant.now().toString(); // ISO-8601 UTC representation string
        ChatMessage chatMessage = ChatMessage.builder()
                .messageId("msg_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8))
                .doctorId(doctorId)
                .patientId(patientId)
                .senderId(UserContext.getUserId())
                .message(textMessage)
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .build();

        chatRepo.save(chatMessage);

        return ResponseEntity.status(201).body(Map.of(
            "success", true,
            "data", chatMessage
        ));
    }

    @GetMapping("/messages")
    public ResponseEntity<?> getChatHistory(@RequestParam String doctorId, @RequestParam String patientId) {
        if (isInvalidRole()) return forbiddenResponse();

        String currentUser = UserContext.getUserId();
        
        // Security check: Verify the user requesting the history belongs to this specific chat
        if (!currentUser.equals(doctorId) && !currentUser.equals(patientId)) {
            return ResponseEntity.status(403).body(Map.of(
                "success", false,
                "message", "Forbidden: You cannot view conversations belonging to other profiles."
            ));
        }

        List<ChatMessage> logs = chatRepo.findByDoctorIdAndPatientIdOrderByCreatedAtDesc(doctorId, patientId);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", logs
        ));
    }
}