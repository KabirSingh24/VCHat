package com.VChat.VChat.config;


import com.VChat.VChat.controller.SocketHandler;
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


import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.*;


@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final SocketHandler socketHandler;

    public WebSocketConfig(SocketHandler socketHandler) {
        this.socketHandler = socketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(socketHandler, "/ws")
                .setAllowedOrigins("https://vchatpage.onrender.com", "http://localhost:3000")
                .withSockJS(); // allows SockJS fallback
    }
}
