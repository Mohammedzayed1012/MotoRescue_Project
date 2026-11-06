package com.motorescue.backend.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;

import com.motorescue.backend.entity.RescueRequest;
import com.motorescue.backend.entity.SupportMessage;
import com.motorescue.backend.entity.SupportThread;
import com.motorescue.backend.entity.User;
import com.motorescue.backend.repository.RescueRequestRepository;
import com.motorescue.backend.repository.SupportMessageRepository;
import com.motorescue.backend.repository.SupportThreadRepository;

/**
 * Rescue desk chat. A built-in assistant answers the rider first using the real
 * rescue request context (mechanic, ETA, price, status). If the rider says the
 * issue is not sorted, the conversation is escalated to an operations admin.
 */
@Service
public class SupportService {

    private static final String ASSISTANT_NAME = "Rescue desk assistant";
    private static final List<String> ACTIVE_STATUSES = List.of(
            RescueRequest.STATUS_SEARCHING,
            RescueRequest.STATUS_EN_ROUTE,
            RescueRequest.STATUS_ARRIVED);
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("h:mm a");

    private final SupportThreadRepository threadRepository;
    private final SupportMessageRepository messageRepository;
    private final RescueRequestRepository requestRepository;

    public SupportService(SupportThreadRepository threadRepository,
            SupportMessageRepository messageRepository,
            RescueRequestRepository requestRepository) {
        this.threadRepository = threadRepository;
        this.messageRepository = messageRepository;
        this.requestRepository = requestRepository;
    }

    /**
     * Returns the rider's conversation, creating it on first contact, refreshing
     * the context and seeding the assistant's opening message.
     */
    public SupportThread openForRider(User rider, String issue, String requestReference, String requestStatus) {
        SupportThread thread = threadRepository.findByRiderId(rider.getId())
                .orElseGet(SupportThread::new);

        thread.setRiderId(rider.getId());
        thread.setRiderName(rider.getFullName());
        thread.setRiderEmail(rider.getEmail());
        thread.setRiderPhone(rider.getPhone());

        if (issue != null && !issue.isBlank()) {
            thread.setIssue(issue.trim());
        } else if (thread.getIssue() == null || thread.getIssue().isBlank()) {
            thread.setIssue("General enquiry");
        }

        if (requestReference != null && !requestReference.isBlank()) {
            thread.setRequestReference(requestReference.trim());
        }

        if (requestStatus != null && !requestStatus.isBlank()) {
            thread.setRequestStatus(requestStatus.trim());
        }

        SupportThread saved = threadRepository.save(thread);
        RescueRequest request = contextFor(saved);
        seedAssistantGreeting(saved, request);

        return saved;
    }

    public SupportThread forRider(Long riderId) {
        return threadRepository.findByRiderId(riderId).orElse(null);
    }

    public List<SupportThread> all() {
        return threadRepository.findAllByOrderByEscalatedDescUpdatedAtDesc();
    }

    public SupportThread get(Long id) {
        return threadRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found."));
    }

    public List<SupportMessage> messages(Long threadId) {
        // Fail fast when the caller asks for an unknown conversation.
        get(threadId);
        return messageRepository.findByThreadIdOrderByIdAsc(threadId);
    }

    /**
     * Stores a rider or admin message. While a conversation is handled by the
     * assistant, rider messages get an automatic, context-aware answer instead
     * of landing in the admin's unread queue.
     */
    public SupportMessage send(Long threadId, String senderRole, String senderName, String body) {
        SupportThread thread = get(threadId);

        String role = senderRole == null ? "" : senderRole.trim().toUpperCase(Locale.ROOT);
        if (!SupportThread.ROLE_CUSTOMER.equals(role) && !SupportThread.ROLE_ADMIN.equals(role)) {
            throw new RuntimeException("Unknown sender.");
        }

        String text = clean(body);
        if (text.isEmpty()) {
            throw new RuntimeException("Write a message before sending.");
        }

        SupportMessage saved = append(thread, role, senderName, text);

        if (SupportThread.ROLE_CUSTOMER.equals(role)) {
            if (thread.isEscalated()) {
                // A human is now handling the conversation.
                thread.setAdminUnread(thread.getAdminUnread() + 1);
            } else {
                RescueRequest request = contextFor(thread);
                String reply = assistantReply(thread, request, text);
                SupportMessage ai = append(thread, SupportThread.ROLE_AI, ASSISTANT_NAME, reply);
                saved = ai;
                thread.setRiderUnread(thread.getRiderUnread() + 1);
            }
        } else {
            thread.setRiderUnread(thread.getRiderUnread() + 1);
        }

        threadRepository.save(thread);
        return saved;
    }

    /**
     * Brings a human admin into the conversation. The escalation reason is shown
     * in the admin inbox next to the rider's issue and request reference.
     */
    public SupportThread escalate(Long threadId, String reason, String riderName) {
        SupportThread thread = get(threadId);
        if (thread.isEscalated()) {
            return thread;
        }

        String cleanReason = clean(reason);
        if (cleanReason.isEmpty()) {
            cleanReason = "Issue not sorted";
        }
        if (cleanReason.length() > 200) {
            cleanReason = cleanReason.substring(0, 200);
        }

        thread.setEscalated(true);
        thread.setEscalationReason(cleanReason);
        thread.setEscalatedAt(LocalDateTime.now());
        thread.setAdminUnread(thread.getAdminUnread() + 1);

        String who = clean(riderName).isEmpty() ? "the rider" : clean(riderName);
        String body = "I'm bringing an operations admin into this chat for " + who
                + " because: " + cleanReason + ". They can see request "
                + (thread.getRequestReference() == null ? "details" : thread.getRequestReference())
                + " and our full conversation, so you don't need to repeat anything. An admin will reply here.";
        append(thread, SupportThread.ROLE_AI, ASSISTANT_NAME, body);
        thread.setRiderUnread(thread.getRiderUnread() + 1);

        return threadRepository.save(thread);
    }

    /** Returns the conversation to the assistant once an admin has closed it. */
    public SupportThread resolve(Long threadId) {
        SupportThread thread = get(threadId);
        if (!thread.isEscalated()) {
            return thread;
        }

        thread.setEscalated(false);
        thread.setEscalationReason(null);
        thread.setEscalatedAt(null);
        thread.setAdminUnread(0);

        append(thread, SupportThread.ROLE_AI, ASSISTANT_NAME,
                "An operations admin marked this conversation resolved. I'm still here if anything else comes up.");
        thread.setRiderUnread(thread.getRiderUnread() + 1);

        return threadRepository.save(thread);
    }

    public SupportThread markRead(Long threadId, String role) {
        SupportThread thread = get(threadId);
        String normalized = role == null ? "" : role.trim().toUpperCase(Locale.ROOT);

        if (SupportThread.ROLE_CUSTOMER.equals(normalized)) {
            thread.setRiderUnread(0);
        } else {
            thread.setAdminUnread(0);
        }

        return threadRepository.save(thread);
    }

    /* Assistant ------------------------------------------------------------- */

    private void seedAssistantGreeting(SupportThread thread, RescueRequest request) {
        if (messageRepository.countByThreadId(thread.getId()) > 0) {
            return;
        }

        StringBuilder body = new StringBuilder();
        body.append("Hi ").append(firstName(thread.getRiderName()))
                .append(", I'm the MotoRescue rescue desk assistant. ");

        if (request != null) {
            body.append("I can see request ").append(request.getReference());
            if (request.getServiceLabel() != null && !request.getServiceLabel().isBlank()) {
                body.append(" for ").append(request.getServiceLabel().toLowerCase(Locale.ROOT));
            }
            if (request.getBikeLabel() != null && !request.getBikeLabel().isBlank()) {
                body.append(" on your ").append(request.getBikeLabel());
            }
            if (request.getLocation() != null && !request.getLocation().isBlank()) {
                body.append(" at ").append(request.getLocation());
            }
            body.append(". ");
            body.append(statusLine(request)).append(' ');
        } else {
            body.append("I can't see a live rescue on your account right now. ")
                    .append("If you have already requested one, tell me the MR reference and I'll check it. ");
        }

        body.append("Ask me about the mechanic's arrival time, the price or the status. ")
                .append("If the issue still isn't sorted, tap \"Issue not sorted\" and I'll bring an admin in.");

        append(thread, SupportThread.ROLE_AI, ASSISTANT_NAME, body.toString());
        thread.setRiderUnread(thread.getRiderUnread() + 1);
        threadRepository.save(thread);
    }

    private String statusLine(RescueRequest request) {
        String status = request.getStatus() == null ? "" : request.getStatus().toUpperCase(Locale.ROOT);
        String mechanic = clean(request.getMechanicName());

        return switch (status) {
            case RescueRequest.STATUS_EN_ROUTE -> mechanic.isEmpty()
                    ? "A mechanic has accepted and is on the way."
                    : "Mechanic " + mechanic + " is on the way"
                            + (request.getEtaMinutes() == null ? "." : " and should reach you in about "
                                    + request.getEtaMinutes() + " minutes.");
            case RescueRequest.STATUS_ARRIVED -> mechanic.isEmpty()
                    ? "The mechanic has marked arrived at your location."
                    : "Mechanic " + mechanic + " has arrived at your location.";
            case RescueRequest.STATUS_COMPLETED -> "This rescue is marked completed. If the bike still isn't right, tell me.";
            case RescueRequest.STATUS_CANCELLED -> "This request was cancelled, so no mechanic is assigned.";
            default -> "We're matching you with the nearest verified mechanic. There's no ETA yet.";
        };
    }

    private String assistantReply(SupportThread thread, RescueRequest request, String text) {
        String q = text.toLowerCase(Locale.ROOT);

        if (isStillBroken(q)) {
            return "I'm sorry it's still not sorted. Tap \"Issue not sorted\" below and I'll bring an operations admin "
                    + "into this chat straight away. They will see request "
                    + referenceOf(thread) + " and everything we've discussed.";
        }

        if (isAskingForEta(q)) {
            return etaAnswer(thread, request);
        }

        if (isAskingForPrice(q)) {
            return priceAnswer(thread, request);
        }

        if (isAskingForMechanic(q)) {
            return mechanicAnswer(thread, request);
        }

        if (isAskingForLocationChange(q)) {
            return "I've noted that. If a mechanic is already on the way, a new location changes the ETA, "
                    + "so tap \"Need more help\" and an admin can update request " + referenceOf(thread)
                    + " for you. If nobody has accepted yet, the new location will be used when they do.";
        }

        if (isPositive(q)) {
            return "Great — I'm glad that's sorted. I'll keep request " + referenceOf(thread)
                    + " open in case anything else comes up. You can close this page whenever you're ready.";
        }

        return "Thanks, I've added that to request " + referenceOf(thread)
                + ". I can help with the mechanic's arrival time, the price or the status. "
                + "If the issue still isn't sorted, tap \"Issue not sorted\" and an admin will take over.";
    }

    private String etaAnswer(SupportThread thread, RescueRequest request) {
        if (request == null) {
            return "I can't see a live rescue on your account yet. If you've already requested one, "
                    + "share the MR reference and I'll check the mechanic's arrival time.";
        }

        String mechanic = clean(request.getMechanicName());
        String status = request.getStatus() == null ? "" : request.getStatus().toUpperCase(Locale.ROOT);

        return switch (status) {
            case RescueRequest.STATUS_EN_ROUTE -> {
                String who = mechanic.isEmpty() ? "A mechanic" : "Mechanic " + mechanic;
                if (request.getEtaMinutes() != null) {
                    yield who + " has accepted request " + request.getReference()
                            + " and should reach you in about " + request.getEtaMinutes() + " minutes"
                            + (request.getDistance() == null || request.getDistance().isBlank()
                                    ? "."
                                    : " (" + request.getDistance() + " away).");
                }
                yield who + " has accepted request " + request.getReference()
                        + " and is on the way. The live map on your dashboard shows the latest position.";
            }
            case RescueRequest.STATUS_ARRIVED -> {
                String when = request.getArrivedAt() == null ? "" : " at " + request.getArrivedAt().format(TIME_FORMAT);
                yield (mechanic.isEmpty() ? "The mechanic" : "Mechanic " + mechanic)
                        + " marked arrived" + when + ". If you can't see them, call "
                        + (request.getMechanicPhone() == null || request.getMechanicPhone().isBlank()
                                ? "the rescue desk"
                                : request.getMechanicPhone())
                        + ".";
            }
            case RescueRequest.STATUS_COMPLETED -> "Request " + request.getReference()
                    + " is already marked completed. If the bike still isn't right, tap \"Issue not sorted\" "
                    + "and an admin will step in.";
            case RescueRequest.STATUS_CANCELLED -> "Request " + request.getReference()
                    + " was cancelled, so no mechanic is on the way. Start a new rescue from your dashboard "
                    + "or tap \"Need more help\" and an admin can look into it.";
            default -> "We're still matching you with the nearest verified mechanic for request "
                    + request.getReference() + ". There's no ETA yet — the moment a mechanic accepts, "
                    + "I'll post the arrival time here.";
        };
    }

    private String priceAnswer(SupportThread thread, RescueRequest request) {
        if (request == null) {
            return "There's no live request on your account, so there's no quote yet. "
                    + "Once you request a rescue, the price is confirmed before any work starts.";
        }

        String quote = clean(request.getQuote());
        if (!quote.isEmpty()) {
            return "The agreed quote for request " + request.getReference() + " is " + quote
                    + ". Payment is collected after the job is done and the mechanic should not ask for anything extra. "
                    + "If you're charged differently, tap \"Need more help\" and an admin will review it.";
        }

        return "For request " + request.getReference()
                + " no quote has been recorded yet. The mechanic confirms the price with you before starting work. "
                + "If you're unsure about a charge, tap \"Need more help\" and an admin can check it.";
    }

    private String mechanicAnswer(SupportThread thread, RescueRequest request) {
        if (request == null || clean(request.getMechanicName()).isEmpty()) {
            return "No mechanic has accepted request " + referenceOf(thread)
                    + " yet. I'll post their name, phone number and ETA here as soon as they do.";
        }

        String phone = clean(request.getMechanicPhone());
        return "Mechanic " + request.getMechanicName() + " is handling request " + request.getReference()
                + (phone.isEmpty() ? "." : ". You can call them on " + phone + ".");
    }

    /* Helpers --------------------------------------------------------------- */

    private SupportMessage append(SupportThread thread, String role, String senderName, String body) {
        String text = clean(body);
        if (text.length() > 1000) {
            text = text.substring(0, 1000);
        }

        SupportMessage message = new SupportMessage();
        message.setThreadId(thread.getId());
        message.setSenderRole(role);
        message.setSenderName(senderName);
        message.setBody(text);

        SupportMessage saved = messageRepository.save(message);

        thread.setLastMessage(text.length() > 500 ? text.substring(0, 500) : text);
        thread.setLastSenderRole(role);

        return saved;
    }

    private RescueRequest contextFor(SupportThread thread) {
        if (thread.getRiderId() == null) {
            return null;
        }

        return requestRepository
                .findFirstByRiderIdAndStatusInOrderByCreatedAtDesc(thread.getRiderId(), ACTIVE_STATUSES)
                .orElseGet(() -> requestRepository.findByRiderIdOrderByCreatedAtDesc(thread.getRiderId())
                        .stream()
                        .findFirst()
                        .orElse(null));
    }

    private String referenceOf(SupportThread thread) {
        return thread.getRequestReference() == null || thread.getRequestReference().isBlank()
                ? "your rescue"
                : thread.getRequestReference();
    }

    private String firstName(String fullName) {
        String name = clean(fullName);
        if (name.isEmpty()) {
            return "there";
        }
        return name.split("\\s+")[0];
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isStillBroken(String q) {
        return containsAny(q, "not sorted", "not fixed", "not resolved", "still not", "still broken",
                "still waiting", "not working", "same issue", "same problem", "hasn't arrived",
                "has not arrived", "not arrived", "no one came", "nobody came", "not done");
    }

    private boolean isAskingForEta(String q) {
        return containsAny(q, "when", "how long", "how much time", "eta", "arrive", "arriving",
                "coming", "reach", "time will", "what time");
    }

    private boolean isAskingForPrice(String q) {
        return containsAny(q, "price", "cost", "charge", "quote", "payment", "pay", "bill", "fees");
    }

    private boolean isAskingForMechanic(String q) {
        return containsAny(q, "mechanic", "who is coming", "who's coming", "phone number", "contact number");
    }

    private boolean isAskingForLocationChange(String q) {
        return containsAny(q, "change location", "change the location", "different location",
                "new location", "wrong location", "move my rescue", "address");
    }

    private boolean isPositive(String q) {
        return containsAny(q, "fixed", "sorted", "resolved", "working now", "all good", "thank");
    }

    private boolean containsAny(String text, String... needles) {
        for (String needle : needles) {
            if (text.contains(needle)) {
                return true;
            }
        }
        return false;
    }
}
