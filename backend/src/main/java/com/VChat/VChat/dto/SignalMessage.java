package com.VChat.VChat.dto;

import lombok.Data;

@Data
public class SignalMessage {
    private String toSessionId;
    private Object data;
    private String fromSessionId;
    // getters/setters
}
