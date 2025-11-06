package com.VChat.VChat.config;


import org.slf4j.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.*;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.*;

@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    @Autowired
    private SessionService sessionService;

    @EventListener
    public void handleSessionConnectedEvent(SessionConnectEvent event) {
        StompHeaderAccessor sha = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = sha.getSessionId();
        logger.info("WebSocket connected, sessionId={}", sessionId);
        sessionService.registerSession(sessionId);
    }

    @EventListener
    public void handleSessionDisconnectEvent(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        logger.info("WebSocket disconnected, sessionId={}", sessionId);
        // remove session and broadcast user-left
        String username = sessionService.removeSession(sessionId);
        if (username != null) {
            sessionService.broadcastUserLeft(sessionId, username);
        }
    }
}
