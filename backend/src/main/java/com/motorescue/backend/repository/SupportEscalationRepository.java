package com.motorescue.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.motorescue.backend.entity.SupportEscalation;

public interface SupportEscalationRepository extends JpaRepository<SupportEscalation, Long> {

    List<SupportEscalation> findTop25ByOrderByCreatedAtDesc();

    List<SupportEscalation> findTop25ByStatusOrderByCreatedAtDesc(String status);
}
