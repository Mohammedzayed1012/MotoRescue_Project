package com.motorescue.backend.service;

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

        String encodedPassword =
                passwordEncoder.encode(user.getPassword());

        user.setPassword(encodedPassword);
        user.setRole(normalizeRole(user.getRole()));

        return userRepository.save(user);
    }

    public User loginUser(String email, String password) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                    new RuntimeException("User not found!"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid email or password!");
        }

        return user;
    }

    /**
     * Only riders and mechanics can self-register. Anything else falls back to
     * the safest role, so a crafted request cannot create an admin account.
     */
    private String normalizeRole(String requestedRole) {
        if (requestedRole == null || requestedRole.isBlank()) {
            return User.ROLE_CUSTOMER;
        }

        String role = requestedRole.trim().toUpperCase();

        if (User.ROLE_MECHANIC.equals(role)) {
            return User.ROLE_MECHANIC;
        }

        return User.ROLE_CUSTOMER;
    }
}
