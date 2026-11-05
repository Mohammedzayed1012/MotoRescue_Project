package com.motorescue.backend.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.motorescue.backend.controller.BookingRequest;
import com.motorescue.backend.controller.BookingResponse;
import com.motorescue.backend.entity.Booking;
import com.motorescue.backend.entity.User;
import com.motorescue.backend.repository.BookingRepository;
import com.motorescue.backend.repository.UserRepository;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    public BookingService(BookingRepository bookingRepository, UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
    }

    public BookingResponse createBooking(BookingRequest request) {
        User customer = userRepository.findById(request.customerId())
                .filter(user -> User.ROLE_CUSTOMER.equals(user.getRole()))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Customer account was not found."));

        Booking booking = new Booking(
                customer,
                request.service().trim(),
                request.bike().trim(),
                request.location().trim(),
                request.notes() == null || request.notes().isBlank() ? null : request.notes().trim());

        return toResponse(bookingRepository.save(booking));
    }

    private BookingResponse toResponse(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getCustomer().getId(),
                booking.getService(),
                booking.getBike(),
                booking.getLocation(),
                booking.getNotes(),
                booking.getStatus(),
                booking.getCreatedAt());
    }
}
