package com.motorescue.backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

    public static final String ROLE_CUSTOMER = "CUSTOMER";
    public static final String ROLE_MECHANIC = "MECHANIC";
    public static final String ROLE_ADMIN = "ADMIN";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(length = 15)
    private String phone;

    @Column(length = 20)
    private String role;

    @Column(length = 100)
    private String workshop;

    @Column(length = 80)
    private String city;

    @Column(length = 80)
    private String specialty;

    @Column(name = "service_radius_km")
    private Integer serviceRadiusKm;

    @Column(name = "is_online")
    private Boolean online;

    @Column(name = "is_verified")
    private Boolean verified;

    @Column(name = "rating")
    private Double rating;

    @Column(name = "total_jobs")
    private Integer totalJobs;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public User() {
    }

    public User(String fullName, String email, String password, String phone) {
        this.fullName = fullName;
        this.email = email;
        this.password = password;
        this.phone = phone;
        this.role = ROLE_CUSTOMER;
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    /**
     * Older rows created before roles existed have no value stored.
     * Treat them as riders so authentication keeps working after the upgrade.
     */
    public String getRole() {
        return (role == null || role.isBlank()) ? ROLE_CUSTOMER : role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getWorkshop() {
        return workshop;
    }

    public void setWorkshop(String workshop) {
        this.workshop = workshop;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }

    public Integer getServiceRadiusKm() {
        return serviceRadiusKm == null ? 12 : serviceRadiusKm;
    }

    public void setServiceRadiusKm(Integer serviceRadiusKm) {
        this.serviceRadiusKm = serviceRadiusKm;
    }

    public boolean isOnline() {
        return Boolean.TRUE.equals(online);
    }

    public void setOnline(Boolean online) {
        this.online = online;
    }

    public boolean isVerified() {
        return Boolean.TRUE.equals(verified);
    }

    public void setVerified(Boolean verified) {
        this.verified = verified;
    }

    public double getRating() {
        return rating == null ? 0d : rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public int getTotalJobs() {
        return totalJobs == null ? 0 : totalJobs;
    }

    public void setTotalJobs(Integer totalJobs) {
        this.totalJobs = totalJobs;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();

        if (role == null || role.isBlank()) {
            role = ROLE_CUSTOMER;
        }
        if (online == null) {
            online = false;
        }
        if (verified == null) {
            verified = false;
        }
        if (rating == null) {
            rating = 0d;
        }
        if (totalJobs == null) {
            totalJobs = 0;
        }
    }
}
