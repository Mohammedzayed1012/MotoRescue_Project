package com.motorescue.backend.service;

import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.motorescue.backend.entity.RescueRequest;
import com.motorescue.backend.entity.Review;
import com.motorescue.backend.entity.User;
import com.motorescue.backend.repository.RescueRequestRepository;
import com.motorescue.backend.repository.ReviewRepository;
import com.motorescue.backend.repository.UserRepository;

/**
 * Post-rescue reviews. Riders rate the service and the mechanic's behaviour,
 * and the mechanic's average score is recalculated after every review.
 */
@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final RescueRequestRepository requestRepository;
    private final UserRepository userRepository;

    public ReviewService(ReviewRepository reviewRepository,
            RescueRequestRepository requestRepository,
            UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Review create(Long requestId, Long riderId, Integer serviceRating,
            Integer behaviourRating, String comment) {
        if (requestId == null) {
            throw new RuntimeException("Choose the rescue you want to review.");
        }
        if (riderId == null) {
            throw new RuntimeException("Rider account is required.");
        }

        RescueRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Rescue request not found."));

        if (!RescueRequest.STATUS_COMPLETED.equals(request.getStatus())) {
            throw new RuntimeException("You can review a rescue once the work is completed.");
        }
        if (!Objects.equals(request.getRiderId(), riderId)) {
            throw new RuntimeException("You can only review your own rescue.");
        }
        if (request.getMechanicId() == null) {
            throw new RuntimeException("This rescue has no mechanic to rate.");
        }
        if (reviewRepository.existsByRequestId(requestId)) {
            throw new RuntimeException("You have already reviewed this rescue.");
        }

        int service = validateRating(serviceRating, "service");
        int behaviour = validateRating(behaviourRating, "mechanic behaviour");

        Review review = new Review();
        review.setRequestId(request.getId());
        review.setRequestReference(request.getReference());
        review.setRiderId(request.getRiderId());
        review.setRiderName(request.getRiderName());
        review.setMechanicId(request.getMechanicId());
        review.setMechanicName(request.getMechanicName());
        review.setServiceRating(service);
        review.setBehaviourRating(behaviour);
        review.setRating(Math.round(((service + behaviour) / 2.0) * 10.0) / 10.0);
        review.setComment(cleanComment(comment));

        Review saved = reviewRepository.save(review);
        refreshMechanicRating(request.getMechanicId());

        return saved;
    }

    public List<Review> forRider(Long riderId) {
        return reviewRepository.findByRiderIdOrderByCreatedAtDesc(riderId);
    }

    public List<Review> forMechanic(Long mechanicId) {
        return reviewRepository.findByMechanicIdOrderByCreatedAtDesc(mechanicId);
    }

    private void refreshMechanicRating(Long mechanicId) {
        User mechanic = userRepository.findById(mechanicId).orElse(null);
        if (mechanic == null) {
            return;
        }

        double average = reviewRepository.findByMechanicIdOrderByCreatedAtDesc(mechanicId)
                .stream()
                .map(Review::getRating)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0);

        if (average > 0) {
            mechanic.setRating(Math.round(average * 10.0) / 10.0);
            userRepository.save(mechanic);
        }
    }

    private int validateRating(Integer value, String label) {
        if (value == null || value < 1 || value > 5) {
            throw new RuntimeException("Give a " + label + " rating from 1 to 5 stars.");
        }
        return value;
    }

    private String cleanComment(String comment) {
        String text = comment == null ? "" : comment.trim();
        if (text.length() > 1000) {
            text = text.substring(0, 1000);
        }
        return text;
    }
}
