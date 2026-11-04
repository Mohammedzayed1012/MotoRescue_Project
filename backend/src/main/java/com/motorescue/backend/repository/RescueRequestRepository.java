package com.motorescue.backend.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.motorescue.backend.entity.RescueRequest;

public interface RescueRequestRepository extends JpaRepository<RescueRequest, Long> {

    List<RescueRequest> findAllByOrderByCreatedAtDesc();

    List<RescueRequest> findByRiderIdOrderByCreatedAtDesc(Long riderId);

    List<RescueRequest> findByRiderIdAndStatusInOrderByCreatedAtDesc(
            Long riderId, Collection<String> statuses);

    List<RescueRequest> findByStatusOrderByCreatedAtAsc(String status);

    List<RescueRequest> findByMechanicIdOrderByCreatedAtDesc(Long mechanicId);

    List<RescueRequest> findByMechanicIdAndStatusInOrderByCreatedAtDesc(
            Long mechanicId, Collection<String> statuses);

    Optional<RescueRequest> findFirstByRiderIdAndStatusInOrderByCreatedAtDesc(
            Long riderId, Collection<String> statuses);

    Optional<RescueRequest> findFirstByMechanicIdAndStatusInOrderByCreatedAtDesc(
            Long mechanicId, Collection<String> statuses);

    List<RescueRequest> findByCreatedAtAfterOrderByCreatedAtAsc(LocalDateTime since);

    long countByStatus(String status);

    long countByStatusIn(Collection<String> statuses);

    long countByStatusAndCompletedAtAfter(String status, LocalDateTime since);
}
