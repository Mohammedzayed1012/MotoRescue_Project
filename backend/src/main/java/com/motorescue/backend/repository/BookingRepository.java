package com.motorescue.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.motorescue.backend.entity.Booking;

public interface BookingRepository extends JpaRepository<Booking, Long> {
}
