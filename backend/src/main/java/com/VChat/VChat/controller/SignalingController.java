package com.VChat.VChat.controller;


import com.VChat.VChat.config.SessionService;
import com.VChat.VChat.dto.ChatMessage;
import com.VChat.VChat.dto.JoinMessage;
import com.VChat.VChat.dto.SignalMessage;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@Controller
public class SignalingController {

    private static final Logger logger = LoggerFactory.getLogger(SignalingController.class);

    @Autowired
    private SessionService sessionService;

    // clients send to /app/join-call
    @MessageMapping("/join-call")
    public void joinCall(JoinMessage joinMessage, @Header("simpSessionId") String sessionId) {
        logger.info("join-call from {}: room={}, username={}", sessionId, joinMessage.getRoom(), joinMessage.getUsername());
        // register username and broadcast to subscribers of the room
        sessionService.broadcastUserJoined(sessionId, joinMessage.getUsername(), joinMessage.getRoom());
    }

    // clients send to /app/signal
    @MessageMapping("/signal")
    public void signal(SignalMessage signal, @Header("simpSessionId") String sessionId) {
        logger.info("Signal from {} to {}", sessionId, signal.getToSessionId());
        Map<String, Object> payload = new HashMap<>();
        payload.put("from", sessionId);
        payload.put("data", signal.getData());
        sessionService.forwardSignal(signal.getToSessionId(), payload, sessionId);
    }

    // clients send to /app/chat-message
    @MessageMapping("/chat-message")
    public void chatMessage(ChatMessage chatMessage, @Header("simpSessionId") String sessionId) {
        logger.info("Chat in room {} from {}: {}", chatMessage.getRoom(), sessionId, chatMessage.getMessage());
        Map<String, Object> payload = new HashMap<>();
        payload.put("sender", chatMessage.getSender());
        payload.put("message", chatMessage.getMessage());
        sessionService.broadcastChat(chatMessage.getRoom(), payload);
    }
}
