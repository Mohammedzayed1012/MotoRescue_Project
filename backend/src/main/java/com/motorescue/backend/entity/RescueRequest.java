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
@Table(name = "rescue_requests")
public class RescueRequest {

    public static final String STATUS_SEARCHING = "SEARCHING";
    public static final String STATUS_EN_ROUTE = "EN_ROUTE";
    public static final String STATUS_ARRIVED = "ARRIVED";
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_CANCELLED = "CANCELLED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 20)
    private String reference;

    @Column(nullable = false)
    private Long riderId;

    @Column(length = 100)
    private String riderName;

    @Column(length = 20)
    private String riderPhone;

    private Long mechanicId;

    @Column(length = 100)
    private String mechanicName;

    @Column(length = 20)
    private String mechanicPhone;

    @Column(length = 40)
    private String serviceId;

    @Column(length = 120)
    private String serviceLabel;

    @Column(length = 40)
    private String icon;

    @Column(length = 160)
    private String bikeLabel;

    @Column(length = 255)
    private String location;

    private Double latitude;

    private Double longitude;

    @Column(length = 1000)
    private String notes;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(length = 40)
    private String quote;

    private Integer payout;

    private Integer etaMinutes;

    @Column(length = 40)
    private String distance;

    private LocalDateTime createdAt;

    private LocalDateTime acceptedAt;

    private LocalDateTime arrivedAt;

    private LocalDateTime completedAt;

    private LocalDateTime cancelledAt;

    public RescueRequest() {
    }

    public Long getId() {
        return id;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public Long getRiderId() {
        return riderId;
    }

    public void setRiderId(Long riderId) {
        this.riderId = riderId;
    }

    public String getRiderName() {
        return riderName;
    }

    public void setRiderName(String riderName) {
        this.riderName = riderName;
    }

    public String getRiderPhone() {
        return riderPhone;
    }

    public void setRiderPhone(String riderPhone) {
        this.riderPhone = riderPhone;
    }

    public Long getMechanicId() {
        return mechanicId;
    }

    public void setMechanicId(Long mechanicId) {
        this.mechanicId = mechanicId;
    }

    public String getMechanicName() {
        return mechanicName;
    }

    public void setMechanicName(String mechanicName) {
        this.mechanicName = mechanicName;
    }

    public String getMechanicPhone() {
        return mechanicPhone;
    }

    public void setMechanicPhone(String mechanicPhone) {
        this.mechanicPhone = mechanicPhone;
    }

    public String getServiceId() {
        return serviceId;
    }

    public void setServiceId(String serviceId) {
        this.serviceId = serviceId;
    }

    public String getServiceLabel() {
        return serviceLabel;
    }

    public void setServiceLabel(String serviceLabel) {
        this.serviceLabel = serviceLabel;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getBikeLabel() {
        return bikeLabel;
    }

    public void setBikeLabel(String bikeLabel) {
        this.bikeLabel = bikeLabel;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getQuote() {
        return quote;
    }

    public void setQuote(String quote) {
        this.quote = quote;
    }

    public Integer getPayout() {
        return payout;
    }

    public void setPayout(Integer payout) {
        this.payout = payout;
    }

    public Integer getEtaMinutes() {
        return etaMinutes;
    }

    public void setEtaMinutes(Integer etaMinutes) {
        this.etaMinutes = etaMinutes;
    }

    public String getDistance() {
        return distance;
    }

    public void setDistance(String distance) {
        this.distance = distance;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getAcceptedAt() {
        return acceptedAt;
    }

    public void setAcceptedAt(LocalDateTime acceptedAt) {
        this.acceptedAt = acceptedAt;
    }

    public LocalDateTime getArrivedAt() {
        return arrivedAt;
    }

    public void setArrivedAt(LocalDateTime arrivedAt) {
        this.arrivedAt = arrivedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public LocalDateTime getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(LocalDateTime cancelledAt) {
        this.cancelledAt = cancelledAt;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();

        if (status == null || status.isBlank()) {
            status = STATUS_SEARCHING;
        }
    }
}
