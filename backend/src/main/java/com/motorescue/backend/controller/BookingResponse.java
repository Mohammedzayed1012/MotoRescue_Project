package com.motorescue.backend.controller;

import java.time.LocalDateTime;

public record BookingResponse(
        Long id,
        Long customerId,
        String service,
        String bike,
        String location,
        String notes,
        String status,
        LocalDateTime createdAt) {
}
