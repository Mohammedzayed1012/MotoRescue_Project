package com.motorescue.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.motorescue.backend.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRoleOrderByFullNameAsc(String role);

    List<User> findAllByOrderByCreatedAtAsc();

    long countByRole(String role);

    long countByRoleAndOnlineTrue(String role);
}
