package com.motorescue.backend.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.motorescue.backend.entity.User;
import com.motorescue.backend.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = { "http://localhost:4200", "http://127.0.0.1:4200" })
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            requireText(user.getFullName(), "Please enter your full name.");
            requireText(user.getEmail(), "Please enter your email address.");
            requireText(user.getPassword(), "Please choose a password.");

            user.setEmail(user.getEmail().trim().toLowerCase());
            user.setFullName(user.getFullName().trim());

            User savedUser = authService.registerUser(user);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(userResponse("Registration successful!", savedUser));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String password = request.get("password");

            requireText(email, "Please enter your email address.");
            requireText(password, "Please enter your password.");

            User user = authService.loginUser(email.trim().toLowerCase(), password);

            return ResponseEntity.ok(userResponse("Login successful!", user));

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email or password!"));
        }
    }

    private Map<String, Object> userResponse(String message, User user) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", message);
        body.put("userId", user.getId());
        body.put("fullName", user.getFullName());
        body.put("email", user.getEmail());
        body.put("role", user.getRole());
        body.put("online", user.isOnline());
        body.put("verified", user.isVerified());
        body.put("rating", user.getRating());
        body.put("totalJobs", user.getTotalJobs());
        if (user.getCreatedAt() != null) {
            body.put("createdAt", user.getCreatedAt().toString());
        }

        if (user.getPhone() != null) {
            body.put("phone", user.getPhone());
        }
        if (user.getWorkshop() != null) {
            body.put("workshop", user.getWorkshop());
        }
        if (user.getCity() != null) {
            body.put("city", user.getCity());
        }
        if (user.getSpecialty() != null) {
            body.put("specialty", user.getSpecialty());
        }

        return body;
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new RuntimeException(message);
        }
    }
}
