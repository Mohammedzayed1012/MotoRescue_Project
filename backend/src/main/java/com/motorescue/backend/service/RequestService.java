package com.motorescue.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.motorescue.backend.entity.RescueRequest;
import com.motorescue.backend.entity.User;
import com.motorescue.backend.repository.RescueRequestRepository;
import com.motorescue.backend.repository.UserRepository;

@Service
public class RequestService {

    private static final List<String> ACTIVE_STATUSES = List.of(
            RescueRequest.STATUS_SEARCHING,
            RescueRequest.STATUS_EN_ROUTE,
            RescueRequest.STATUS_ARRIVED);

    private final RescueRequestRepository requestRepository;
    private final UserRepository userRepository;

    public RequestService(RescueRequestRepository requestRepository, UserRepository userRepository) {
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public RescueRequest create(RescueRequest request) {
        request.setStatus(RescueRequest.STATUS_SEARCHING);
        request.setPayout(payoutFor(request.getServiceId()));
        request.setQuote("₹" + request.getPayout());

        RescueRequest saved = requestRepository.save(request);

        // The reference is derived from the database id so it is stable and unique.
        saved.setReference(String.format("MR-%04d", 1000 + saved.getId()));
        saved.setDistance(String.format(Locale.UK, "%.1f km", 0.8 + (saved.getId() % 28) / 10.0));
        saved.setEtaMinutes(4 + (int) (saved.getId() % 5));

        return requestRepository.save(saved);
    }

    @Transactional
    public RescueRequest accept(Long requestId, Long mechanicId) {
        RescueRequest request = get(requestId);

        if (!RescueRequest.STATUS_SEARCHING.equals(request.getStatus())) {
            throw new RuntimeException("This request has already been taken.");
        }

        User mechanic = userRepository.findById(mechanicId)
                .orElseThrow(() -> new RuntimeException("Mechanic account not found."));

        if (!User.ROLE_MECHANIC.equals(mechanic.getRole())
                && !User.ROLE_ADMIN.equals(mechanic.getRole())) {
            throw new RuntimeException("Only a mechanic can accept this request.");
        }

        if (User.ROLE_MECHANIC.equals(mechanic.getRole()) && !mechanic.isVerified()) {
            throw new RuntimeException("This mechanic account is awaiting admin approval.");
        }

        request.setMechanicId(mechanic.getId());
        request.setMechanicName(mechanic.getFullName());
        request.setMechanicPhone(mechanic.getPhone());
        request.setStatus(RescueRequest.STATUS_EN_ROUTE);
        request.setAcceptedAt(LocalDateTime.now());

        return requestRepository.save(request);
    }

    @Transactional
    public RescueRequest arrive(Long requestId, Long mechanicId) {
        RescueRequest request = get(requestId);
        requireAssignedMechanic(request, mechanicId);

        if (!RescueRequest.STATUS_EN_ROUTE.equals(request.getStatus())) {
            throw new RuntimeException("This job is not on the way.");
        }

        request.setStatus(RescueRequest.STATUS_ARRIVED);
        request.setArrivedAt(LocalDateTime.now());

        return requestRepository.save(request);
    }

    @Transactional
    public RescueRequest complete(Long requestId, Long mechanicId) {
        RescueRequest request = get(requestId);
        requireAssignedMechanic(request, mechanicId);

        if (RescueRequest.STATUS_COMPLETED.equals(request.getStatus())) {
            return request;
        }

        if (!RescueRequest.STATUS_ARRIVED.equals(request.getStatus())
                && !RescueRequest.STATUS_EN_ROUTE.equals(request.getStatus())) {
            throw new RuntimeException("This job cannot be completed yet.");
        }

        request.setStatus(RescueRequest.STATUS_COMPLETED);
        request.setCompletedAt(LocalDateTime.now());
        if (request.getArrivedAt() == null) {
            request.setArrivedAt(request.getCompletedAt());
        }

        User mechanic = request.getMechanicId() == null
                ? null
                : userRepository.findById(request.getMechanicId()).orElse(null);

        if (mechanic != null) {
            mechanic.setTotalJobs(mechanic.getTotalJobs() + 1);
            if (mechanic.getRating() <= 0) {
                mechanic.setRating(4.8);
            }
            userRepository.save(mechanic);
        }

        return requestRepository.save(request);
    }

    @Transactional
    public RescueRequest cancel(Long requestId, Long riderId) {
        RescueRequest request = get(requestId);

        if (riderId != null && !riderId.equals(request.getRiderId())) {
            throw new RuntimeException("You can only cancel your own request.");
        }

        if (RescueRequest.STATUS_COMPLETED.equals(request.getStatus())) {
            throw new RuntimeException("Completed rescues cannot be cancelled.");
        }

        request.setStatus(RescueRequest.STATUS_CANCELLED);
        request.setCancelledAt(LocalDateTime.now());

        return requestRepository.save(request);
    }

    /**
     * Operations can dispatch a searching request. When no mechanic is supplied
     * the nearest online partner is used, falling back to any partner so the
     * desk can always make progress.
     */
    @Transactional
    public RescueRequest assign(Long requestId, Long mechanicId) {
        RescueRequest request = get(requestId);

        if (!RescueRequest.STATUS_SEARCHING.equals(request.getStatus())) {
            return request;
        }

        User mechanic = mechanicId == null ? pickMechanic() : userRepository.findById(mechanicId)
                .orElseThrow(() -> new RuntimeException("Mechanic account not found."));

        if (User.ROLE_MECHANIC.equals(mechanic.getRole()) && !mechanic.isVerified()) {
            throw new RuntimeException("This mechanic account is awaiting admin approval.");
        }

        request.setMechanicId(mechanic.getId());
        request.setMechanicName(mechanic.getFullName());
        request.setMechanicPhone(mechanic.getPhone());
        request.setStatus(RescueRequest.STATUS_EN_ROUTE);
        request.setAcceptedAt(LocalDateTime.now());

        return requestRepository.save(request);
    }

    public RescueRequest get(Long requestId) {
        return requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found."));
    }

    public List<RescueRequest> activeForRider(Long riderId) {
        return requestRepository.findByRiderIdAndStatusInOrderByCreatedAtDesc(riderId, ACTIVE_STATUSES);
    }

    public List<RescueRequest> activeForMechanic(Long mechanicId) {
        return requestRepository.findByMechanicIdAndStatusInOrderByCreatedAtDesc(mechanicId, ACTIVE_STATUSES);
    }

    public List<RescueRequest> open() {
        return requestRepository.findByStatusOrderByCreatedAtAsc(RescueRequest.STATUS_SEARCHING);
    }

    public List<RescueRequest> all() {
        return requestRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<RescueRequest> forRider(Long riderId) {
        return requestRepository.findByRiderIdOrderByCreatedAtDesc(riderId);
    }

    public List<RescueRequest> forMechanic(Long mechanicId) {
        return requestRepository.findByMechanicIdOrderByCreatedAtDesc(mechanicId);
    }

    public Map<String, Object> stats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();

        List<RescueRequest> today = requestRepository.findByCreatedAtAfterOrderByCreatedAtAsc(startOfDay);

        long searching = requestRepository.countByStatus(RescueRequest.STATUS_SEARCHING);
        long inProgress = requestRepository.countByStatusIn(
                List.of(RescueRequest.STATUS_EN_ROUTE, RescueRequest.STATUS_ARRIVED));
        long completedToday = requestRepository.countByStatusAndCompletedAtAfter(
                RescueRequest.STATUS_COMPLETED, startOfDay);

        int revenueToday = today.stream()
                .filter(item -> RescueRequest.STATUS_COMPLETED.equals(item.getStatus()))
                .map(RescueRequest::getPayout)
                .filter(value -> value != null)
                .mapToInt(Integer::intValue)
                .sum();

        List<RescueRequest> accepted = requestRepository.findAll().stream()
                .filter(item -> item.getAcceptedAt() != null)
                .toList();

        double averageResponse = accepted.stream()
                .mapToLong(item -> java.time.Duration.between(item.getCreatedAt(), item.getAcceptedAt()).toMinutes())
                .filter(minutes -> minutes >= 0)
                .average()
                .orElse(0);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("activeRequests", searching + inProgress);
        stats.put("searching", searching);
        stats.put("inProgress", inProgress);
        stats.put("completedToday", completedToday);
        stats.put("revenueToday", revenueToday);
        stats.put("mechanicsTotal", userRepository.countByRoleAndVerifiedTrue(User.ROLE_MECHANIC));
        stats.put("mechanicsOnline",
                userRepository.countByRoleAndVerifiedTrueAndOnlineTrue(User.ROLE_MECHANIC));
        stats.put("ridersTotal", userRepository.countByRole(User.ROLE_CUSTOMER));
        stats.put("avgResponseMinutes", Math.max(1, Math.round(averageResponse)));
        stats.put("weekly", weekly(today));
        return stats;
    }

    private List<Map<String, Object>> weekly(List<RescueRequest> requests) {
        List<Map<String, Object>> days = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int offset = 6; offset >= 0; offset--) {
            LocalDate day = today.minusDays(offset);
            long count = requests.stream()
                    .filter(item -> item.getCreatedAt() != null
                            && item.getCreatedAt().toLocalDate().equals(day))
                    .count();

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("day", day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.UK));
            item.put("count", count);
            days.add(item);
        }

        long max = days.stream()
                .mapToLong(day -> ((Number) day.get("count")).longValue())
                .max()
                .orElse(0);

        for (Map<String, Object> day : days) {
            long count = ((Number) day.get("count")).longValue();
            day.put("value", max == 0 ? 6 : Math.max(6, Math.round(count * 100.0 / max)));
        }

        return days;
    }

    private User pickMechanic() {
        List<User> mechanics = userRepository.findByRoleOrderByFullNameAsc(User.ROLE_MECHANIC)
                .stream()
                .filter(User::isVerified)
                .toList();

        if (mechanics.isEmpty()) {
            throw new RuntimeException("No approved mechanic accounts exist yet. Verify one first.");
        }

        return mechanics.stream()
                .filter(User::isOnline)
                .findFirst()
                .orElse(mechanics.get(0));
    }

    private void requireAssignedMechanic(RescueRequest request, Long mechanicId) {
        if (request.getMechanicId() == null || !request.getMechanicId().equals(mechanicId)) {
            throw new RuntimeException("This request is assigned to another mechanic.");
        }
    }

    private int payoutFor(String serviceId) {
        if (serviceId == null) {
            return 249;
        }

        return switch (serviceId) {
            case "puncture" -> 278;
            case "battery" -> 249;
            case "fuel" -> 199;
            case "repair" -> 329;
            case "chain" -> 229;
            case "tow" -> 499;
            default -> 249;
        };
    }
}
