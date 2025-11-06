package com.VChat.VChat.controller;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;


import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
//
//@Component
//public class SignalingHandler extends TextWebSocketHandler {
//
//    private final Map<String, List<WebSocketSession>> connections = new ConcurrentHashMap<>();
//    private final Map<String, List<Map<String, String>>> messages = new ConcurrentHashMap<>();
//    private final ObjectMapper mapper = new ObjectMapper();
//
//    @Override
//    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
//        System.out.println("Connected: " + session.getId());
//    }
//
//    @Override
//    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
//        Map<String, Object> msg = mapper.readValue(message.getPayload(), Map.class);
//        String type = (String) msg.get("type");
//
//        switch (type) {
//            case "join-call":
//                handleJoinCall(session, (String) msg.get("roomId"));
//                break;
//            case "signal":
//                handleSignal(session, (String) msg.get("toId"), msg.get("data"));
//                break;
//            case "chat-message":
//                handleChatMessage(session, (String) msg.get("data"), (String) msg.get("sender"));
//                break;
//            default:
//                System.out.println("Unknown type: " + type);
//        }
//    }
//
//    private void handleJoinCall(WebSocketSession session, String roomId) throws IOException {
//        connections.computeIfAbsent(roomId, k -> new ArrayList<>()).add(session);
//
//        List<String> existingIds = new ArrayList<>();
//        for (WebSocketSession s : connections.get(roomId)) {
//            if (!s.getId().equals(session.getId())) {
//                existingIds.add(s.getId());
//                if (s.isOpen()) s.sendMessage(new TextMessage("{\"type\":\"user-joined\",\"userId\":\"" + session.getId() + "\"}"));
//            }
//        }
//
//        if (session.isOpen()) {
//            session.sendMessage(new TextMessage("{\"type\":\"existing-users\",\"clients\":" + mapper.writeValueAsString(existingIds) + "}"));
//        }
//
//        System.out.println("User " + session.getId() + " joined room " + roomId);
//    }
//
//    private void handleSignal(WebSocketSession sender, String toId, Object data) throws IOException {
//        for (List<WebSocketSession> roomSessions : connections.values()) {
//            for (WebSocketSession s : roomSessions) {
//                if (s.getId().equals(toId) && s.isOpen()) {
//                    s.sendMessage(new TextMessage("{\"type\":\"signal\",\"fromId\":\"" + sender.getId() + "\",\"data\":" + mapper.writeValueAsString(data) + "}"));
//                    return;
//                }
//            }
//        }
//    }
//
//    private void handleChatMessage(WebSocketSession sender, String data, String username) throws IOException {
//        String roomId = findRoomBySession(sender);
//        if (roomId == null) return;
//
//        messages.computeIfAbsent(roomId, k -> new ArrayList<>())
//                .add(Map.of("type", "chat-message", "data", data, "sender", username, "fromId", sender.getId()));
//
//        for (WebSocketSession s : connections.get(roomId)) {
//            if (s.isOpen()) {
//                s.sendMessage(new TextMessage("{\"type\":\"chat-message\",\"data\":\"" + data + "\",\"sender\":\"" + username + "\",\"fromId\":\"" + sender.getId() + "\"}"));
//            }
//        }
//    }
//
//    private String findRoomBySession(WebSocketSession session) {
//        for (Map.Entry<String, List<WebSocketSession>> entry : connections.entrySet()) {
//            if (entry.getValue().contains(session)) return entry.getKey();
//        }
//        return null;
//    }
//
//    @Override
//    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
//        connections.forEach((roomId, sessions) -> {
//            if (sessions.remove(session)) {
//                sessions.forEach(s -> {
//                    try {
//                        if (s.isOpen()) s.sendMessage(new TextMessage("{\"type\":\"user-left\",\"userId\":\"" + session.getId() + "\"}"));
//                    } catch (IOException e) {
//                        e.printStackTrace();
//                    }
//                });
//            }
//        });
//        System.out.println("Disconnected: " + session.getId());
//    }
//}





import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class SignalingHandler extends TextWebSocketHandler {

    // Map of roomId -> list of sessions (participants)
    private final Map<String, List<WebSocketSession>> connections = new ConcurrentHashMap<>();

    // Map of sessionId -> connection time
    private final Map<String, Date> timeOnline = new ConcurrentHashMap<>();

    // Map of roomId -> chat messages
    private final Map<String, List<Map<String, String>>> messages = new ConcurrentHashMap<>();

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        System.out.println("New connection established: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Map<String, Object> msg = mapper.readValue(message.getPayload(), Map.class);
        String type = (String) msg.get("type");

        switch (type) {
            case "join-call":
                handleJoinCall(session, (String) msg.get("roomId"));
                break;

            case "signal":
                handleSignal(session, (String) msg.get("toId"), (String) msg.get("data"));
                break;

            case "chat-message":
                handleChatMessage(session, (String) msg.get("data"), (String) msg.get("sender"));
                break;

            default:
                System.out.println("Unknown message type: " + type);
        }
    }

    private void handleJoinCall(WebSocketSession session, String roomId) throws Exception {
        connections.computeIfAbsent(roomId, k -> new ArrayList<>()).add(session);
        timeOnline.put(session.getId(), new Date());

        // Send existing users to the new user
        List<String> existingUsers = new ArrayList<>();
        for (WebSocketSession s : connections.get(roomId)) {
            if (!s.getId().equals(session.getId())) existingUsers.add(s.getId());
        }

        Map<String, Object> existingMsg = Map.of(
                "type", "existing-users",
                "users", existingUsers
        );
        session.sendMessage(new TextMessage(mapper.writeValueAsString(existingMsg)));

        // Notify others that a new user joined
        for (WebSocketSession s : connections.get(roomId)) {
            if (s.isOpen() && !s.getId().equals(session.getId())) {
                s.sendMessage(new TextMessage("{\"type\":\"user-joined\",\"userId\":\"" + session.getId() + "\"}"));
            }
        }

        // Send chat history if available
        if (messages.containsKey(roomId)) {
            for (Map<String, String> msg : messages.get(roomId)) {
                session.sendMessage(new TextMessage(mapper.writeValueAsString(msg)));
            }
        }

        System.out.println("User " + session.getId() + " joined room " + roomId);
    }

    private void handleSignal(WebSocketSession sender, String toId, String data) throws Exception {
        for (List<WebSocketSession> roomSessions : connections.values()) {
            for (WebSocketSession s : roomSessions) {
                if (s.getId().equals(toId) && s.isOpen()) {
                    s.sendMessage(new TextMessage("{\"type\":\"signal\",\"fromId\":\"" + sender.getId() + "\",\"data\":" + data + "}"));
                    return;
                }
            }
        }
    }

    private void handleChatMessage(WebSocketSession sender, String data, String username) throws Exception {
        String roomId = findRoomBySession(sender);
        if (roomId == null) return;

        messages.computeIfAbsent(roomId, k -> new ArrayList<>())
                .add(Map.of("type", "chat-message", "data", data, "sender", username, "fromId", sender.getId()));

        for (WebSocketSession s : connections.get(roomId)) {
            if (s.isOpen()) {
                s.sendMessage(new TextMessage("{\"type\":\"chat-message\",\"data\":\"" + data + "\",\"sender\":\"" + username + "\",\"fromId\":\"" + sender.getId() + "\"}"));
            }
        }
    }

    private String findRoomBySession(WebSocketSession session) {
        for (Map.Entry<String, List<WebSocketSession>> entry : connections.entrySet()) {
            if (entry.getValue().contains(session)) {
                return entry.getKey();
            }
        }
        return null;
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        connections.forEach((roomId, sessions) -> {
            if (sessions.remove(session)) {
                sessions.forEach(s -> {
                    try {
                        if (s.isOpen()) {
                            s.sendMessage(new TextMessage("{\"type\":\"user-left\",\"userId\":\"" + session.getId() + "\"}"));
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                });
            }
        });
        timeOnline.remove(session.getId());
        System.out.println("User disconnected: " + session.getId());
    }
}




















//
//// SignalingHandler.java
//
//import com.fasterxml.jackson.databind.ObjectMapper;
//import org.springframework.stereotype.Component;
//import org.springframework.web.socket.*;
//import org.springframework.web.socket.handler.TextWebSocketHandler;
//
//import java.io.IOException;
//import java.util.*;
//import java.util.concurrent.ConcurrentHashMap;
//
//@Component
//public class SignalingHandler extends TextWebSocketHandler {
//
//    private final Map<String, List<WebSocketSession>> connections = new ConcurrentHashMap<>();
//    private final Map<String, Date> timeOnline = new ConcurrentHashMap<>();
//    private final Map<String, List<Map<String, String>>> messages = new ConcurrentHashMap<>();
//    private final ObjectMapper mapper = new ObjectMapper();
//
//    @Override
//    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
//        System.out.println("New connection: " + session.getId());
//    }
//
//    @Override
//    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
//        Map<String, Object> msg = mapper.readValue(message.getPayload(), Map.class);
//        String type = (String) msg.get("type");
//
//        switch (type) {
//            case "join-call":
//                handleJoinCall(session, (String) msg.get("roomId"));
//                break;
//            case "signal":
//                handleSignal(session, (String) msg.get("toId"), (String) msg.get("data"));
//                break;
//            case "chat-message":
//                handleChatMessage(session, (String) msg.get("data"), (String) msg.get("sender"));
//                break;
//            default:
//                System.out.println("Unknown message type: " + type);
//        }
//    }
//
//    private void handleJoinCall(WebSocketSession session, String roomId) throws IOException {
//        connections.computeIfAbsent(roomId, k -> new ArrayList<>()).add(session);
//        timeOnline.put(session.getId(), new Date());
//
//        List<String> existingIds = new ArrayList<>();
//        for (WebSocketSession s : connections.get(roomId)) {
//            if (!s.getId().equals(session.getId())) {
//                existingIds.add(s.getId());
//                if (s.isOpen()) {
//                    s.sendMessage(new TextMessage("{\"type\":\"user-joined\",\"userId\":\"" + session.getId() + "\"}"));
//                }
//            }
//        }
//
//        // Change this inside handleJoinCall
//        if (session.isOpen()) {
//            Map<String, Object> payload = new HashMap<>();
//            payload.put("type", "existing-users");
//            payload.put("clients", existingIds);   // <--- make sure it's "clients"
//            session.sendMessage(new TextMessage(mapper.writeValueAsString(payload)));
//        }
//
//
//        // send chat history if available
//        if (messages.containsKey(roomId)) {
//            for (Map<String, String> msgMap : messages.get(roomId)) {
//                session.sendMessage(new TextMessage(mapper.writeValueAsString(msgMap)));
//            }
//        }
//
//        System.out.println("User " + session.getId() + " joined room " + roomId);
//    }
//
//    private void handleSignal(WebSocketSession sender, String toId, String data) throws IOException {
//        for (List<WebSocketSession> roomSessions : connections.values()) {
//            for (WebSocketSession s : roomSessions) {
//                if (s.getId().equals(toId) && s.isOpen()) {
//                    s.sendMessage(new TextMessage("{\"type\":\"signal\",\"fromId\":\"" + sender.getId() + "\",\"data\":" + data + "}"));
//                    return;
//                }
//            }
//        }
//    }
//
//    private void handleChatMessage(WebSocketSession sender, String data, String username) throws IOException {
//        String roomId = findRoomBySession(sender);
//        if (roomId == null) return;
//
//        Map<String, String> msgMap = Map.of(
//                "type", "chat-message",
//                "data", data,
//                "sender", username,
//                "fromId", sender.getId()
//        );
//
//        messages.computeIfAbsent(roomId, k -> new ArrayList<>()).add(msgMap);
//
//        for (WebSocketSession s : connections.get(roomId)) {
//            if (s.isOpen()) s.sendMessage(new TextMessage(mapper.writeValueAsString(msgMap)));
//        }
//    }
//
//    private String findRoomBySession(WebSocketSession session) {
//        for (Map.Entry<String, List<WebSocketSession>> entry : connections.entrySet()) {
//            if (entry.getValue().contains(session)) return entry.getKey();
//        }
//        return null;
//    }
//
//    @Override
//    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
//        connections.forEach((roomId, sessions) -> {
//            if (sessions.remove(session)) {
//                sessions.forEach(s -> {
//                    try {
//                        if (s.isOpen()) {
//                            s.sendMessage(new TextMessage("{\"type\":\"user-left\",\"userId\":\"" + session.getId() + "\"}"));
//                        }
//                    } catch (IOException e) {
//                        e.printStackTrace();
//                    }
//                });
//            }
//        });
//        timeOnline.remove(session.getId());
//        System.out.println("User disconnected: " + session.getId());
//    }
//}



































//@Component
//public class SignalingHandler extends TextWebSocketHandler {
//
//
//    // Map of roomId -> list of sessions (participants)
//    private final Map<String, List<WebSocketSession>> connections = new ConcurrentHashMap<>();
//
//    // Map of sessionId -> connection time
//    private final Map<String, Date> timeOnline = new ConcurrentHashMap<>();
//
//    // Map of roomId -> chat messages
//    private final Map<String, List<Map<String, String>>> messages = new ConcurrentHashMap<>();
//
//    @Override
//    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
//        System.out.println("New connection established: " + session.getId());
//        connections.forEach((roomId, sessions) -> {
//            if (sessions != null && sessions.remove(session)) {
//
//                //Remove any stale or null sessions
//                sessions.removeIf(s -> s == null || !s.isOpen());
//
//                // Safely notify remaining participants
//                for (WebSocketSession s : sessions) {
//                    try {
//                        if (s != null && s.isOpen()) {
//                            s.sendMessage(new TextMessage("{\"type\":\"user-left\",\"userId\":\"" + session.getId() + "\"}"));
//                        }
//                    } catch (Exception e) {
//                        e.printStackTrace();
//                    }
//                }
//
//                // Clean up empty rooms
//                if (sessions.isEmpty()) {
//                    connections.remove(roomId);
//                }
//            }
//        });
//
//        timeOnline.remove(session.getId());
//        System.out.println("User disconnected: " + session.getId());
//    }
//
//    @Override
//    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
//        String payload = message.getPayload();
//        // Expected format: {"type":"join-call","roomId":"xyz"} or {"type":"signal","toId":"abc","data":"..."}
//
//        Map<String, Object> msg = new com.fasterxml.jackson.databind.ObjectMapper().readValue(payload, Map.class);
//        String type = (String) msg.get("type");
//
//        switch (type) {
//            case "join-call":
//                handleJoinCall(session, (String) msg.get("roomId"));
//                break;
//
//            case "signal":
//                handleSignal(session, (String) msg.get("toId"), (String) msg.get("data"));
//                break;
//
//            case "chat-message":
//                handleChatMessage(session, (String) msg.get("data"), (String) msg.get("sender"));
//                break;
//
//            default:
//                System.out.println("Unknown message type: " + type);
//        }
//    }
//
//    private void handleJoinCall(WebSocketSession session, String roomId) throws Exception {
//        connections.computeIfAbsent(roomId, k -> new ArrayList<>()).add(session);
//        timeOnline.put(session.getId(), new Date());
//
//        // Notify others in room
//        for (WebSocketSession s : connections.get(roomId)) {
//            if (s.isOpen() && !s.getId().equals(session.getId())) {
//                s.sendMessage(new TextMessage("{\"type\":\"user-joined\",\"userId\":\"" + session.getId() + "\"}"));
//            }
//        }
//
//        // Send chat history if available
//        if (messages.containsKey(roomId)) {
//            for (Map<String, String> msg : messages.get(roomId)) {
//                session.sendMessage(new TextMessage(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(msg)));
//            }
//        }
//
//        System.out.println("User " + session.getId() + " joined room " + roomId);
//    }
//
////    private void handleJoinCall(WebSocketSession session, String roomId) throws Exception {
////        connections.computeIfAbsent(roomId, k -> new ArrayList<>()).add(session);
////        timeOnline.put(session.getId(), new Date());
////
////        List<String> existingIds = new ArrayList<>();
////        for (WebSocketSession s : connections.get(roomId)) {
////            if (!s.getId().equals(session.getId())) {
////                existingIds.add(s.getId());
////            // Notify existing users
////                if (s.isOpen()) {
////                    s.sendMessage(new TextMessage("{\"type\":\"user-joined\",\"userId\":\"" + session.getId() + "\"}"));
////                }
////            }
////        }
////
////    // Send the list of existing users to the new user
////        if (session.isOpen()) {
////                session.sendMessage(new TextMessage("{\"type\":\"existing-users\",\"clients\":" + new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(existingIds) + "}"));
////        }
////
////        System.out.println("User " + session.getId() + " joined room " + roomId);
////    }
//
//
//    private void handleSignal(WebSocketSession sender, String toId, String data) throws Exception {
//        for (List<WebSocketSession> roomSessions : connections.values()) {
//            for (WebSocketSession s : roomSessions) {
//                if (s.getId().equals(toId) && s.isOpen()) {
//                    s.sendMessage(new TextMessage("{\"type\":\"signal\",\"fromId\":\"" + sender.getId() + "\",\"data\":" + data + "}"));
//                    return;
//                }
//            }
//        }
//    }
//
//    private void handleChatMessage(WebSocketSession sender, String data, String username) throws Exception {
//        String roomId = findRoomBySession(sender);
//        if (roomId == null) return;
//
//        messages.computeIfAbsent(roomId, k -> new ArrayList<>())
//                .add(Map.of("type", "chat-message", "data", data, "sender", username, "fromId", sender.getId()));
//
//        for (WebSocketSession s : connections.get(roomId)) {
//            if (s.isOpen()) {
//                s.sendMessage(new TextMessage("{\"type\":\"chat-message\",\"data\":\"" + data + "\",\"sender\":\"" + username + "\",\"fromId\":\"" + sender.getId() + "\"}"));
//            }
//        }
//    }
//
//    private String findRoomBySession(WebSocketSession session) {
//        for (Map.Entry<String, List<WebSocketSession>> entry : connections.entrySet()) {
//            if (entry.getValue().contains(session)) {
//                return entry.getKey();
//            }
//        }
//        return null;
//    }
//
//    @Override
//    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
//        connections.forEach((roomId, sessions) -> {
//            if (sessions.remove(session)) {
//                sessions.forEach(s -> {
//                    try {
//                        if (s.isOpen()) {
//                            s.sendMessage(new TextMessage("{\"type\":\"user-left\",\"userId\":\"" + session.getId() + "\"}"));
//                        }
//                    } catch (Exception e) {
//                        e.printStackTrace();
//                    }
//                });
//            }
//        });
//
//        timeOnline.remove(session.getId());
//        System.out.println("User disconnected: " + session.getId());
//    }
//}















//
//import com.fasterxml.jackson.databind.ObjectMapper;
//import org.springframework.stereotype.Component;
//import org.springframework.web.socket.*;
//import org.springframework.web.socket.handler.TextWebSocketHandler;
//
//import java.io.IOException;
//import java.util.*;
//import java.util.concurrent.ConcurrentHashMap;
//import java.util.stream.Collectors;
//
//@Component
//public class SignalingHandler extends TextWebSocketHandler {
//
//    // roomId -> list of sessions
//    private final Map<String, List<WebSocketSession>> connections = new ConcurrentHashMap<>();
//    private final Map<String, Date> timeOnline = new ConcurrentHashMap<>();
//    private final Map<String, List<Map<String, String>>> messages = new ConcurrentHashMap<>();
//    private final ObjectMapper objectMapper = new ObjectMapper();
//
//    @Override
//    public void afterConnectionEstablished(WebSocketSession session) {
//        System.out.println("New connection: " + session.getId());
//    }
//
//    @Override
//    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
//        Map<String, Object> msg = objectMapper.readValue(message.getPayload(), Map.class);
//        String type = (String) msg.get("type");
//
//        switch (type) {
//            case "join-call":
//                handleJoinCall(session, (String) msg.get("roomId"), (String) msg.get("username"));
//                break;
//            case "signal":
//                handleSignal(session, (String) msg.get("toId"), (Map<String, Object>) msg.get("data"));
//                break;
//            case "chat-message":
//                handleChatMessage(session, (String) msg.get("data"), (String) msg.get("sender"));
//                break;
//            default:
//                System.out.println("Unknown type: " + type);
//        }
//    }
//
//    private void handleJoinCall(WebSocketSession session, String roomId, String username) throws IOException {
//        connections.computeIfAbsent(roomId, k -> new ArrayList<>()).add(session);
//        timeOnline.put(session.getId(), new Date());
//
//        // Send new user the list of existing participants
//        List<String> existingClients = connections.get(roomId).stream()
//                .map(WebSocketSession::getId)
//                .filter(id -> !id.equals(session.getId()))
//                .collect(Collectors.toList());
//
//        Map<String, Object> joinPayload = Map.of(
//                "type", "user-joined",
//                "userId", session.getId(),
//                "clients", existingClients
//        );
//        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(joinPayload)));
//
//        // Notify all other users in room
//        for (WebSocketSession s : connections.get(roomId)) {
//            if (!s.getId().equals(session.getId()) && s.isOpen()) {
//                Map<String, Object> notifyPayload = Map.of(
//                        "type", "user-joined",
//                        "userId", session.getId()
//                );
//                s.sendMessage(new TextMessage(objectMapper.writeValueAsString(notifyPayload)));
//            }
//        }
//
//        // Send chat history
//        if (messages.containsKey(roomId)) {
//            for (Map<String, String> msgMap : messages.get(roomId)) {
//                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(msgMap)));
//            }
//        }
//
//        System.out.println("User " + username + " (" + session.getId() + ") joined room " + roomId);
//    }
//
//    private void handleSignal(WebSocketSession sender, String toId, Map<String, Object> data) throws IOException {
//        for (List<WebSocketSession> roomSessions : connections.values()) {
//            for (WebSocketSession s : roomSessions) {
//                if (s.getId().equals(toId) && s.isOpen()) {
//                    Map<String, Object> payload = Map.of(
//                            "type", "signal",
//                            "fromId", sender.getId(),
//                            "data", data
//                    );
//                    s.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
//                    return;
//                }
//            }
//        }
//    }
//
//    private void handleChatMessage(WebSocketSession sender, String data, String username) throws IOException {
//        String roomId = findRoomBySession(sender);
//        if (roomId == null) return;
//
//        Map<String, String> chatPayload = Map.of(
//                "type", "chat-message",
//                "data", data,
//                "sender", username,
//                "fromId", sender.getId()
//        );
//
//        messages.computeIfAbsent(roomId, k -> new ArrayList<>()).add(chatPayload);
//
//        // Broadcast to all in room
//        for (WebSocketSession s : connections.get(roomId)) {
//            if (s.isOpen()) {
//                s.sendMessage(new TextMessage(objectMapper.writeValueAsString(chatPayload)));
//            }
//        }
//    }
//
//    private String findRoomBySession(WebSocketSession session) {
//        for (Map.Entry<String, List<WebSocketSession>> entry : connections.entrySet()) {
//            if (entry.getValue().contains(session)) return entry.getKey();
//        }
//        return null;
//    }
//
//    @Override
//    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
//        // Remove from all rooms and notify others
//        for (Map.Entry<String, List<WebSocketSession>> entry : connections.entrySet()) {
//            String roomId = entry.getKey();
//            List<WebSocketSession> sessions = entry.getValue();
//            if (sessions.remove(session)) {
//                for (WebSocketSession s : sessions) {
//                    try {
//                        if (s.isOpen()) {
//                            Map<String, Object> payload = Map.of(
//                                    "type", "user-left",
//                                    "userId", session.getId()
//                            );
//                            s.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
//                        }
//                    } catch (Exception e) {
//                        e.printStackTrace();
//                    }
//                }
//            }
//        }
//        timeOnline.remove(session.getId());
//        System.out.println("User disconnected: " + session.getId());
//    }
//}
