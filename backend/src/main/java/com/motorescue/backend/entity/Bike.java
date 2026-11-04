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
@Table(name = "bikes")
public class Bike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long ownerId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "registration_no", nullable = false, length = 30)
    private String regNo;

    @Column(name = "model_year", length = 8)
    private String year;

    @Column(length = 40)
    private String odometer;

    @Column(name = "is_primary")
    private Boolean primaryBike;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Bike() {
    }

    public Long getId() {
        return id;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(Long ownerId) {
        this.ownerId = ownerId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRegNo() {
        return regNo;
    }

    public void setRegNo(String regNo) {
        this.regNo = regNo;
    }

    public String getYear() {
        return year;
    }

    public void setYear(String year) {
        this.year = year;
    }

    public String getOdometer() {
        return odometer;
    }

    public void setOdometer(String odometer) {
        this.odometer = odometer;
    }

    public boolean isPrimaryBike() {
        return Boolean.TRUE.equals(primaryBike);
    }

    public void setPrimaryBike(Boolean primaryBike) {
        this.primaryBike = primaryBike;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();

        if (primaryBike == null) {
            primaryBike = false;
        }
        if (odometer == null || odometer.isBlank()) {
            odometer = "0 km";
        }
    }
}
