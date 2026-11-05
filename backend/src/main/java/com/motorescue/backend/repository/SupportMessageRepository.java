package com.motorescue.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.motorescue.backend.entity.SupportMessage;

public interface SupportMessageRepository extends JpaRepository<SupportMessage, Long> {

    List<SupportMessage> findByThreadIdOrderByCreatedAtAsc(Long threadId);
}
