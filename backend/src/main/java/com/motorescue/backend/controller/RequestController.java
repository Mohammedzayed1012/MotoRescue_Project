package com.motorescue.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.motorescue.backend.entity.RescueRequest;
import com.motorescue.backend.entity.User;
import com.motorescue.backend.repository.UserRepository;
import com.motorescue.backend.service.RequestService;

@RestController
@RequestMapping("/api/requests")
@CrossOrigin(origins = { "http://localhost:4200", "http://127.0.0.1:4200" })
public class RequestController {

    private final RequestService requestService;
    private final UserRepository userRepository;

    public RequestController(RequestService requestService, UserRepository userRepository) {
        this.requestService = requestService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            Long riderId = asLong(body.get("riderId"));
            if (riderId == null) {
                throw new RuntimeException("Rider account is required.");
            }

            User rider = userRepository.findById(riderId)
                    .orElseThrow(() -> new RuntimeException("Rider account not found."));

            RescueRequest request = new RescueRequest();
            request.setRiderId(rider.getId());
            request.setRiderName(rider.getFullName());
            request.setRiderPhone(rider.getPhone());
            request.setServiceId(asText(body.get("serviceId")));
            request.setServiceLabel(asText(body.get("serviceLabel")));
            request.setIcon(asText(body.get("icon")));
            request.setBikeLabel(asText(body.get("bikeLabel")));
            request.setLocation(asText(body.get("location")));
            request.setLatitude(asDouble(body.get("latitude")));
            request.setLongitude(asDouble(body.get("longitude")));
            request.setNotes(asText(body.get("notes")));

            if (request.getLocation() == null || request.getLocation().isBlank()) {
                throw new RuntimeException("Tell us where you are so we can send help.");
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(requestService.create(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public List<RescueRequest> all() {
        return requestService.all();
    }

    @GetMapping("/open")
    public List<RescueRequest> open() {
        return requestService.open();
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        return requestService.stats();
    }

    @GetMapping("/rider/{riderId}")
    public List<RescueRequest> forRider(@PathVariable Long riderId) {
        return requestService.forRider(riderId);
    }

    @GetMapping("/rider/{riderId}/active")
    public ResponseEntity<?> activeForRider(@PathVariable Long riderId) {
        List<RescueRequest> active = requestService.activeForRider(riderId);
        return active.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(active.get(0));
    }

    @GetMapping("/mechanic/{mechanicId}")
    public List<RescueRequest> forMechanic(@PathVariable Long mechanicId) {
        return requestService.forMechanic(mechanicId);
    }

    @GetMapping("/mechanic/{mechanicId}/active")
    public ResponseEntity<?> activeForMechanic(@PathVariable Long mechanicId) {
        List<RescueRequest> active = requestService.activeForMechanic(mechanicId);
        return active.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(active.get(0));
    }

    @GetMapping("/{id}")
    public RescueRequest one(@PathVariable Long id) {
        return requestService.get(id);
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<?> accept(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(requestService.accept(id, requiredLong(body.get("mechanicId"), "Mechanic is required.")));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/arrive")
    public ResponseEntity<?> arrive(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(requestService.arrive(id, requiredLong(body.get("mechanicId"), "Mechanic is required.")));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<?> complete(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(requestService.complete(id, requiredLong(body.get("mechanicId"), "Mechanic is required.")));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        try {
            Long riderId = body == null ? null : asLong(body.get("riderId"));
            return ResponseEntity.ok(requestService.cancel(id, riderId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<?> assign(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        try {
            Long mechanicId = body == null ? null : asLong(body.get("mechanicId"));
            return ResponseEntity.ok(requestService.assign(id, mechanicId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private Long requiredLong(Object value, String message) {
        Long parsed = asLong(value);
        if (parsed == null) {
            throw new RuntimeException(message);
        }
        return parsed;
    }

    private Long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Long.parseLong(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private Double asDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Double.parseDouble(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private String asText(Object value) {
        return value == null ? null : String.valueOf(value).trim();
    }
}
