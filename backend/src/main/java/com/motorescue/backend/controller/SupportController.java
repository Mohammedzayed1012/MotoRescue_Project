package com.motorescue.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.motorescue.backend.entity.SupportMessage;
import com.motorescue.backend.entity.SupportThread;
import com.motorescue.backend.entity.User;
import com.motorescue.backend.repository.UserRepository;
import com.motorescue.backend.service.SupportService;

/**
 * Rescue desk chat: riders talk to the operations team, and admins can see who
 * is writing, what the issue is and which rescue request it belongs to.
 */
@RestController
@RequestMapping("/api/support")
@CrossOrigin(origins = { "http://localhost:4200", "http://127.0.0.1:4200" })
public class SupportController {

    private final SupportService supportService;
    private final UserRepository userRepository;

    public SupportController(SupportService supportService, UserRepository userRepository) {
        this.supportService = supportService;
        this.userRepository = userRepository;
    }

    @PostMapping("/threads")
    public ResponseEntity<?> open(@RequestBody Map<String, Object> body) {
        try {
            Long riderId = asLong(body.get("riderId"));
            if (riderId == null) {
                throw new RuntimeException("Rider account is required.");
            }

            User rider = userRepository.findById(riderId)
                    .orElseThrow(() -> new RuntimeException("Rider account not found."));

            SupportThread thread = supportService.openForRider(
                    rider,
                    asText(body.get("issue")),
                    asText(body.get("requestReference")),
                    asText(body.get("requestStatus")));

            return ResponseEntity.status(HttpStatus.OK).body(thread);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/threads")
    public List<SupportThread> all() {
        return supportService.all();
    }

    @GetMapping("/threads/rider/{riderId}")
    public SupportThread forRider(@PathVariable Long riderId) {
        return supportService.forRider(riderId);
    }

    @GetMapping("/threads/{id}")
    public ResponseEntity<?> one(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(supportService.get(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/threads/{id}/messages")
    public ResponseEntity<?> messages(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(supportService.messages(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/threads/{id}/messages")
    public ResponseEntity<?> send(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            SupportMessage message = supportService.send(
                    id,
                    asText(body.get("senderRole")),
                    asText(body.get("senderName")),
                    asText(body.get("body")));

            return ResponseEntity.status(HttpStatus.CREATED).body(message);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/threads/{id}/read")
    public ResponseEntity<?> read(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        try {
            String role = body == null ? SupportThread.ROLE_ADMIN : asText(body.get("role"));
            return ResponseEntity.ok(supportService.markRead(id, role));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** Rider asks for a human because the assistant could not sort the issue. */
    @PostMapping("/threads/{id}/escalate")
    public ResponseEntity<?> escalate(@PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            String reason = body == null ? null : asText(body.get("reason"));
            String riderName = body == null ? null : asText(body.get("riderName"));
            return ResponseEntity.ok(supportService.escalate(id, reason, riderName));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** Admin closes an escalated conversation and hands it back to the assistant. */
    @PostMapping("/threads/{id}/resolve")
    public ResponseEntity<?> resolve(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(supportService.resolve(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private Long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Long.parseLong(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private String asText(Object value) {
        return value == null ? null : String.valueOf(value).trim();
    }
}
