package com.motorescue.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.motorescue.backend.entity.Review;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findByRequestId(Long requestId);

    boolean existsByRequestId(Long requestId);

    List<Review> findByRiderIdOrderByCreatedAtDesc(Long riderId);

    List<Review> findByMechanicIdOrderByCreatedAtDesc(Long mechanicId);
}
