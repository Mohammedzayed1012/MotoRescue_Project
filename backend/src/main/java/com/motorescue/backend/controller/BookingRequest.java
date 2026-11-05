package com.motorescue.backend.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record BookingRequest(
        @NotNull @Positive Long customerId,
        @NotBlank @Size(max = 100) String service,
        @NotBlank @Size(max = 150) String bike,
        @NotBlank @Size(max = 300) String location,
        @Size(max = 1000) String notes) {
}
