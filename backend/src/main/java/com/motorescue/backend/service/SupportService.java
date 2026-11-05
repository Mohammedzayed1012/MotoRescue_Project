package com.motorescue.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.motorescue.backend.entity.SupportMessage;
import com.motorescue.backend.entity.SupportThread;
import com.motorescue.backend.entity.User;
import com.motorescue.backend.repository.SupportMessageRepository;
import com.motorescue.backend.repository.SupportThreadRepository;

@Service
public class SupportService {

    private final SupportThreadRepository threadRepository;
    private final SupportMessageRepository messageRepository;

    public SupportService(SupportThreadRepository threadRepository,
            SupportMessageRepository messageRepository) {
        this.threadRepository = threadRepository;
        this.messageRepository = messageRepository;
    }

    /**
     * Returns the rider's conversation, creating it on first contact and
     * refreshing the context (issue, request reference, contact details).
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

        return threadRepository.save(thread);
    }

    public SupportThread forRider(Long riderId) {
        return threadRepository.findByRiderId(riderId).orElse(null);
    }

    public List<SupportThread> all() {
        return threadRepository.findAllByOrderByUpdatedAtDesc();
    }

    public SupportThread get(Long id) {
        return threadRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found."));
    }

    public List<SupportMessage> messages(Long threadId) {
        // Fail fast when the caller asks for an unknown conversation.
        get(threadId);
        return messageRepository.findByThreadIdOrderByCreatedAtAsc(threadId);
    }

    public SupportMessage send(Long threadId, String senderRole, String senderName, String body) {
        SupportThread thread = get(threadId);

        String role = senderRole == null ? "" : senderRole.trim().toUpperCase();
        if (!SupportThread.ROLE_CUSTOMER.equals(role) && !SupportThread.ROLE_ADMIN.equals(role)) {
            throw new RuntimeException("Unknown sender.");
        }

        String text = body == null ? "" : body.trim();
        if (text.isEmpty()) {
            throw new RuntimeException("Write a message before sending.");
        }
        if (text.length() > 1000) {
            text = text.substring(0, 1000);
        }

        SupportMessage message = new SupportMessage();
        message.setThreadId(threadId);
        message.setSenderRole(role);
        message.setSenderName(senderName);
        message.setBody(text);

        SupportMessage saved = messageRepository.save(message);

        thread.setLastMessage(text.length() > 500 ? text.substring(0, 500) : text);
        thread.setLastSenderRole(role);
        if (SupportThread.ROLE_CUSTOMER.equals(role)) {
            thread.setAdminUnread(thread.getAdminUnread() + 1);
        } else {
            thread.setRiderUnread(thread.getRiderUnread() + 1);
        }
        threadRepository.save(thread);

        return saved;
    }

    public SupportThread markRead(Long threadId, String role) {
        SupportThread thread = get(threadId);
        String normalized = role == null ? "" : role.trim().toUpperCase();

        if (SupportThread.ROLE_CUSTOMER.equals(normalized)) {
            thread.setRiderUnread(0);
        } else {
            thread.setAdminUnread(0);
        }

        return threadRepository.save(thread);
    }
}
