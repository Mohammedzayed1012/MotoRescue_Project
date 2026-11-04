package com.motorescue.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.motorescue.backend.entity.Bike;
import com.motorescue.backend.repository.BikeRepository;
import com.motorescue.backend.repository.UserRepository;

@RestController
@RequestMapping("/api/bikes")
@CrossOrigin(origins = { "http://localhost:4200", "http://127.0.0.1:4200" })
public class BikeController {

    private final BikeRepository bikeRepository;
    private final UserRepository userRepository;

    public BikeController(BikeRepository bikeRepository, UserRepository userRepository) {
        this.bikeRepository = bikeRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/rider/{riderId}")
    public List<Bike> forRider(@PathVariable Long riderId) {
        return bikeRepository.findByOwnerIdOrderByPrimaryBikeDescIdAsc(riderId);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Bike bike) {
        try {
            if (bike.getOwnerId() == null || !userRepository.existsById(bike.getOwnerId())) {
                throw new RuntimeException("Rider account not found.");
            }
            if (bike.getName() == null || bike.getName().isBlank()) {
                throw new RuntimeException("Enter the bike model.");
            }
            if (bike.getRegNo() == null || bike.getRegNo().isBlank()) {
                throw new RuntimeException("Enter the registration number.");
            }

            boolean firstBike = bikeRepository.countByOwnerId(bike.getOwnerId()) == 0;
            bike.setPrimaryBike(firstBike);
            bike.setName(bike.getName().trim());
            bike.setRegNo(bike.getRegNo().trim().toUpperCase());

            return ResponseEntity.status(HttpStatus.CREATED).body(bikeRepository.save(bike));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/primary")
    public ResponseEntity<?> makePrimary(@PathVariable Long id) {
        Bike bike = bikeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bike not found."));

        bikeRepository.findByOwnerIdOrderByPrimaryBikeDescIdAsc(bike.getOwnerId()).forEach(item -> {
            item.setPrimaryBike(item.getId().equals(id));
            bikeRepository.save(item);
        });

        return ResponseEntity.ok(bike);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!bikeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        Bike bike = bikeRepository.findById(id).orElseThrow();
        Long ownerId = bike.getOwnerId();
        bikeRepository.deleteById(id);

        // Keep exactly one primary bike whenever possible.
        List<Bike> remaining = bikeRepository.findByOwnerIdOrderByPrimaryBikeDescIdAsc(ownerId);
        if (!remaining.isEmpty() && remaining.stream().noneMatch(Bike::isPrimaryBike)) {
            Bike first = remaining.get(0);
            first.setPrimaryBike(true);
            bikeRepository.save(first);
        }

        return ResponseEntity.ok(Map.of("message", "Bike removed."));
    }
}
