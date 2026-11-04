package com.motorescue.backend.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.motorescue.backend.entity.User;
import com.motorescue.backend.repository.UserRepository;
import com.motorescue.backend.service.AuthService;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = { "http://localhost:4200", "http://127.0.0.1:4200" })
public class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;

    public UserController(UserRepository userRepository, AuthService authService) {
        this.userRepository = userRepository;
        this.authService = authService;
    }

    @GetMapping
    public List<Map<String, Object>> all(@RequestParam(required = false) String role) {
        List<User> users = role == null || role.isBlank()
                ? userRepository.findAllByOrderByCreatedAtAsc()
                : userRepository.findByRoleOrderByFullNameAsc(role.trim().toUpperCase());

        return users.stream().map(this::safeUser).toList();
    }

    @GetMapping("/mechanics")
    public List<Map<String, Object>> mechanics() {
        return userRepository.findByRoleOrderByFullNameAsc(User.ROLE_MECHANIC)
                .stream()
                .map(this::safeUser)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> one(@PathVariable Long id) {
        return userRepository.findById(id)
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(safeUser(user)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            User updated = authService.updateProfile(
                    id,
                    asText(body.get("fullName")),
                    asText(body.get("phone")),
                    asText(body.get("workshop")),
                    asText(body.get("city")),
                    asText(body.get("specialty")),
                    asInteger(body.get("serviceRadiusKm")));

            return ResponseEntity.ok(safeUser(updated));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/online")
    public ResponseEntity<?> online(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found."));

        user.setOnline(Boolean.TRUE.equals(body.get("online")));

        return ResponseEntity.ok(safeUser(userRepository.save(user)));
    }

    @PutMapping("/{id}/verify")
    public ResponseEntity<?> verify(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found."));

        user.setVerified(Boolean.TRUE.equals(body.get("verified")));

        return ResponseEntity.ok(safeUser(userRepository.save(user)));
    }

    private Map<String, Object> safeUser(User user) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", user.getId());
        body.put("fullName", user.getFullName());
        body.put("email", user.getEmail());
        body.put("phone", user.getPhone());
        body.put("role", user.getRole());
        body.put("workshop", user.getWorkshop());
        body.put("city", user.getCity());
        body.put("specialty", user.getSpecialty());
        body.put("serviceRadiusKm", user.getServiceRadiusKm());
        body.put("online", user.isOnline());
        body.put("verified", user.isVerified());
        body.put("rating", user.getRating());
        body.put("totalJobs", user.getTotalJobs());
        body.put("createdAt", user.getCreatedAt());
        return body;
    }

    private String asText(Object value) {
        return value == null ? null : String.valueOf(value).trim();
    }

    private Integer asInteger(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
