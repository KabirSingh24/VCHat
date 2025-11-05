package com.VChat.VChat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class VChatApplication {

	public static void main(String[] args) {
		SpringApplication.run(VChatApplication.class, args);
	}

}
