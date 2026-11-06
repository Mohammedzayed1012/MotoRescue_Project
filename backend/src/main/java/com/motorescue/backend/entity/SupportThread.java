package com.motorescue.backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * One support conversation per rider. The thread also carries the context an
 * operations admin needs: who the rider is, what they need help with and which
 * rescue request the conversation is about.
 */
@Entity
@Table(name = "support_threads")
public class SupportThread {

    public static final String ROLE_CUSTOMER = "CUSTOMER";
    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_AI = "AI";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long riderId;

    @Column(length = 100)
    private String riderName;

    @Column(length = 150)
    private String riderEmail;

    @Column(length = 20)
    private String riderPhone;

    /** What the rider needs help with, e.g. "Puncture & tyre repair". */
    @Column(length = 160)
    private String issue;

    /** Reference of the rescue request this conversation is about, e.g. MR-1001. */
    @Column(length = 20)
    private String requestReference;

    @Column(length = 20)
    private String requestStatus;

    @Column(length = 500)
    private String lastMessage;

    @Column(length = 20)
    private String lastSenderRole;

    private Integer adminUnread = 0;

    private Integer riderUnread = 0;

    /** True once the rider asks for a human because the assistant could not sort it. */
    private Boolean escalated = false;

    @Column(length = 200)
    private String escalationReason;

    private LocalDateTime escalatedAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public SupportThread() {
    }

    public Long getId() {
        return id;
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

    public String getRiderEmail() {
        return riderEmail;
    }

    public void setRiderEmail(String riderEmail) {
        this.riderEmail = riderEmail;
    }

    public String getRiderPhone() {
        return riderPhone;
    }

    public void setRiderPhone(String riderPhone) {
        this.riderPhone = riderPhone;
    }

    public String getIssue() {
        return issue;
    }

    public void setIssue(String issue) {
        this.issue = issue;
    }

    public String getRequestReference() {
        return requestReference;
    }

    public void setRequestReference(String requestReference) {
        this.requestReference = requestReference;
    }

    public String getRequestStatus() {
        return requestStatus;
    }

    public void setRequestStatus(String requestStatus) {
        this.requestStatus = requestStatus;
    }

    public String getLastMessage() {
        return lastMessage;
    }

    public void setLastMessage(String lastMessage) {
        this.lastMessage = lastMessage;
    }

    public String getLastSenderRole() {
        return lastSenderRole;
    }

    public void setLastSenderRole(String lastSenderRole) {
        this.lastSenderRole = lastSenderRole;
    }

    public int getAdminUnread() {
        return adminUnread == null ? 0 : adminUnread;
    }

    public void setAdminUnread(Integer adminUnread) {
        this.adminUnread = adminUnread;
    }

    public int getRiderUnread() {
        return riderUnread == null ? 0 : riderUnread;
    }

    public void setRiderUnread(Integer riderUnread) {
        this.riderUnread = riderUnread;
    }

    public boolean isEscalated() {
        return escalated != null && escalated;
    }

    public void setEscalated(Boolean escalated) {
        this.escalated = escalated;
    }

    public String getEscalationReason() {
        return escalationReason;
    }

    public void setEscalationReason(String escalationReason) {
        this.escalationReason = escalationReason;
    }

    public LocalDateTime getEscalatedAt() {
        return escalatedAt;
    }

    public void setEscalatedAt(LocalDateTime escalatedAt) {
        this.escalatedAt = escalatedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;

        if (adminUnread == null) {
            adminUnread = 0;
        }
        if (riderUnread == null) {
            riderUnread = 0;
        }
        if (escalated == null) {
            escalated = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
