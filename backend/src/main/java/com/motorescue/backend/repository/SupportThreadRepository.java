package com.motorescue.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.motorescue.backend.entity.SupportThread;

public interface SupportThreadRepository extends JpaRepository<SupportThread, Long> {

    Optional<SupportThread> findByRiderId(Long riderId);

    List<SupportThread> findAllByOrderByUpdatedAtDesc();

    /** Escalated conversations stay at the top of the admin inbox. */
    List<SupportThread> findAllByOrderByEscalatedDescUpdatedAtDesc();
}
