package com.VChat.VChat.config;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionService {

    // sessionId -> username
    private final Map<String, String> sessions = new ConcurrentHashMap<>();

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void registerSession(String sessionId) {
        sessions.putIfAbsent(sessionId, ""); // placeholder; set username on join
    }

    public void setUsername(String sessionId, String username) {
        sessions.put(sessionId, username);
    }

    public String removeSession(String sessionId) {
        return sessions.remove(sessionId);
    }

    public Map<String, String> getSessions() {
        return Collections.unmodifiableMap(sessions);
    }

    public void broadcastUserJoined(String sessionId, String username, String room) {
        setUsername(sessionId, username);
        // send the list of clients to everyone subscribed to the room
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", sessionId);
        payload.put("username", username);
        payload.put("clients", sessions.keySet());
        messagingTemplate.convertAndSend("/topic/" + room + "/user-joined", payload);
    }

    public void broadcastUserLeft(String sessionId, String username) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", sessionId);
        payload.put("username", username);
        // broadcast to all rooms; for simplicity we send on a global topic
        messagingTemplate.convertAndSend("/topic/user-left", payload);
    }

    public void forwardSignal(String toSessionId, Map<String, Object> signalPayload, String fromSessionId) {
        // send to specific user queue: /queue/signal-{toSessionId} or to their subscription
        messagingTemplate.convertAndSend("/topic/signal/" + toSessionId, signalPayload);
    }

    public void broadcastChat(String room, Map<String, Object> chatPayload) {
        messagingTemplate.convertAndSend("/topic/" + room + "/chat", chatPayload);
    }
}
