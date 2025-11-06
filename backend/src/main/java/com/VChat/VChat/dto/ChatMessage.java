package com.VChat.VChat.dto;

import lombok.Data;

@Data
public class ChatMessage {
    private String room;
    private String message;
    private String sender;
    // getters/setters
}
