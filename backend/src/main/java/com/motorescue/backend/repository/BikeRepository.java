package com.motorescue.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.motorescue.backend.entity.Bike;

public interface BikeRepository extends JpaRepository<Bike, Long> {

    List<Bike> findByOwnerIdOrderByPrimaryBikeDescIdAsc(Long ownerId);

    long countByOwnerId(Long ownerId);

    void deleteByOwnerId(Long ownerId);
}
