package com.VChat.VChat.config;


import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

//@Configuration
//@EnableWebSocket
//public class WebSocketConfig implements WebSocketConfigurer {
//
//
//    @Override
//    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
//        registry.addHandler(new SignalingHandler(),"/ws")
//                .setAllowedOrigins("https://vchatpage.onrender.com")
//                .withSockJS();
//    }
//}

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // REST endpoint for SockJS clients to connect to
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins("https://vchatpage.onrender.com", "http://localhost:3000")
                .withSockJS();
    }

    // Configure simple broker and application destination prefixes
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // clients subscribe to /topic/** for broadcasts, /queue/** for point-to-point (optional)
        config.enableSimpleBroker("/topic", "/queue");
        // messages from client with @MessageMapping mapped to /app/**
        config.setApplicationDestinationPrefixes("/app");
    }
}