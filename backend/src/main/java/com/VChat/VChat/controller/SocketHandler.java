package com.VChat.VChat.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.*;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(SocketHandler.class);
    private final ObjectMapper mapper = new ObjectMapper();

    // sessionId → WebSocketSession
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    // sessionId → username
    private final Map<String, String> usernames = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.put(session.getId(), session);
        logger.info("✅ Connected: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode json = mapper.readTree(message.getPayload());
        String type = json.get("type").asText();

        switch (type) {
            case "join" -> handleJoin(session, json);
            case "signal" -> handleSignal(session, json);
            case "chat" -> handleChat(session, json);
            case "leave" -> handleLeave(session);
            default -> logger.warn("⚠️ Unknown message type: {}", type);
        }
    }

    private void handleJoin(WebSocketSession session, JsonNode json) throws Exception {
        String username = json.get("username").asText();
        String room = json.get("room").asText();

        usernames.put(session.getId(), username);

        Map<String, Object> payload = Map.of(
                "type", "user-joined",
                "id", session.getId(),
                "username", username,
                "clients", sessions.keySet()
        );
        broadcastToAll(mapper.writeValueAsString(payload));
        logger.info("👤 {} joined room {}", username, room);
    }

    private void handleSignal(WebSocketSession session, JsonNode json) throws Exception {
        String to = json.get("to").asText();
        JsonNode data = json.get("data");

        WebSocketSession target = sessions.get(to);
        if (target != null && target.isOpen()) {
            Map<String, Object> payload = Map.of(
                    "type", "signal",
                    "from", session.getId(),
                    "data", data
            );
            target.sendMessage(new TextMessage(mapper.writeValueAsString(payload)));
        }
    }

    private void handleChat(WebSocketSession session, JsonNode json) throws Exception {
        String sender = usernames.get(session.getId());
        String message = json.get("message").asText();

        Map<String, Object> payload = Map.of(
                "type", "chat",
                "sender", sender,
                "message", message
        );
        broadcastToAll(mapper.writeValueAsString(payload));
    }

    private void handleLeave(WebSocketSession session) throws Exception {
        String username = usernames.remove(session.getId());

        Map<String, Object> payload = Map.of(
                "type", "user-left",
                "id", session.getId(),
                "username", username
        );
        broadcastToAll(mapper.writeValueAsString(payload));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session.getId());
        usernames.remove(session.getId());
        logger.info("❌ Disconnected: {}", session.getId());

        Map<String, Object> payload = Map.of(
                "type", "user-left",
                "id", session.getId()
        );
        broadcastToAll(mapper.writeValueAsString(payload));
    }

    private void broadcastToAll(String message) throws Exception {
        for (WebSocketSession s : sessions.values()) {
            if (s.isOpen()) s.sendMessage(new TextMessage(message));
        }
    }
}
