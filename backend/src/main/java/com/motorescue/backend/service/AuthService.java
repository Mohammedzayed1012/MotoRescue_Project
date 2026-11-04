package com.motorescue.backend.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.motorescue.backend.entity.User;
import com.motorescue.backend.repository.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    public User registerUser(User user) {

        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email is already registered!");
        }

        String encodedPassword = passwordEncoder.encode(user.getPassword());

        user.setPassword(encodedPassword);
        user.setRole(normalizeRole(user.getRole()));
        user.setOnline(false);
        user.setRating(0d);
        user.setTotalJobs(0);

        if (User.ROLE_MECHANIC.equals(user.getRole())) {
            // New partners start unverified until operations approves them.
            user.setVerified(false);
            if (user.getServiceRadiusKm() == null) {
                user.setServiceRadiusKm(12);
            }
        } else {
            user.setVerified(true);
        }

        return userRepository.save(user);
    }

    public User loginUser(String email, String password) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found!"));

        if (!passwordMatches(password, user.getPassword())) {
            throw new RuntimeException("Invalid email or password!");
        }

        boolean changed = false;

        // Accounts created before BCrypt was introduced stored the raw password.
        // Verify it once, then transparently upgrade the row to a secure hash.
        if (!isBcryptHash(user.getPassword())) {
            user.setPassword(passwordEncoder.encode(password));
            changed = true;
        }

        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole(User.ROLE_CUSTOMER);
            changed = true;
        }

        return changed ? userRepository.save(user) : user;
    }

    public User updateProfile(Long userId, String fullName, String phone, String workshop,
                              String city, String specialty) {
        return updateProfile(userId, fullName, phone, workshop, city, specialty, null);
    }

    public User updateProfile(Long userId, String fullName, String phone, String workshop,
                              String city, String specialty, Integer serviceRadiusKm) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found!"));

        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName.trim());
        }
        if (phone != null) {
            user.setPhone(phone.trim());
        }
        if (workshop != null) {
            user.setWorkshop(workshop.trim());
        }
        if (city != null) {
            user.setCity(city.trim());
        }
        if (specialty != null) {
            user.setSpecialty(specialty.trim());
        }
        if (serviceRadiusKm != null && serviceRadiusKm > 0) {
            user.setServiceRadiusKm(serviceRadiusKm);
        }

        return userRepository.save(user);
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null) {
            return false;
        }

        if (isBcryptHash(storedPassword)) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }

        return MessageDigest.isEqual(
                rawPassword.getBytes(StandardCharsets.UTF_8),
                storedPassword.getBytes(StandardCharsets.UTF_8));
    }

    private boolean isBcryptHash(String value) {
        return value != null
                && (value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$"));
    }

    /**
     * Riders, mechanics and operations staff can create their own account from
     * the sign-up screen. The role is still constrained to the three known
     * values, so a crafted request cannot invent a role.
     */
    private String normalizeRole(String requestedRole) {
        if (requestedRole == null || requestedRole.isBlank()) {
            return User.ROLE_CUSTOMER;
        }

        String role = requestedRole.trim().toUpperCase();

        if (User.ROLE_MECHANIC.equals(role)) {
            return User.ROLE_MECHANIC;
        }
        if (User.ROLE_ADMIN.equals(role)) {
            return User.ROLE_ADMIN;
        }

        return User.ROLE_CUSTOMER;
    }
}
