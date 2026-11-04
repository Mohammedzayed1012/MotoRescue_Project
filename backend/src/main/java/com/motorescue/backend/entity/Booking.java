package com.motorescue.backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "customer_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_bookings_customer"))
    private User customer;

    @Column(name = "service_type", nullable = false, length = 100)
    private String service;

    @Column(nullable = false, length = 150)
    private String bike;

    @Column(nullable = false, length = 300)
    private String location;

    @Column(length = 1000)
    private String notes;

    @Column(name = "booking_status", nullable = false, length = 30)
    private String status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Booking() {
    }

    public Booking(User customer, String service, String bike, String location, String notes) {
        this.customer = customer;
        this.service = service;
        this.bike = bike;
        this.location = location;
        this.notes = notes;
        this.status = "SEARCHING";
    }

    public Long getId() {
        return id;
    }

    public User getCustomer() {
        return customer;
    }

    public String getService() {
        return service;
    }

    public String getBike() {
        return bike;
    }

    public String getLocation() {
        return location;
    }

    public String getNotes() {
        return notes;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
