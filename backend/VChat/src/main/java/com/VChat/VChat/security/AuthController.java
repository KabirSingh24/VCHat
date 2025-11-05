package com.VChat.VChat.security;


import com.VChat.VChat.dto.LoginDto;
import com.VChat.VChat.dto.LoginResponseDto;
import com.VChat.VChat.dto.SignupDto;
import com.VChat.VChat.model.Meeting;
import com.VChat.VChat.model.User;
import com.VChat.VChat.repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    @Autowired
    private final UserRepo userRepo;

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(@RequestBody LoginDto loginDto){
        return ResponseEntity.status(HttpStatus.OK).body(authService.login(loginDto));
    }

    @PostMapping("/registry")
    public ResponseEntity<String> registry(@RequestBody SignupDto signupDto){
        return authService.registry(signupDto);
    }


    @GetMapping("/getUserHistory")
    public ResponseEntity<?> getUserHistory(@RequestParam String token) {
        try {
            List<Meeting> meetings = authService.getUserHistory(token);
            return ResponseEntity.ok(meetings);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Something went wrong: " + e.getMessage()));
        }
    }

    @PostMapping("/addUserHistory")
    public ResponseEntity<?> addToHistory(@RequestBody Map<String, String> body) {
        try {
            String token = body.get("token");
            String meetingCode = body.get("meeting_code");

            authService.addToHistory(token, meetingCode);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", "Added code to history"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Something went wrong: " + e.getMessage()));
        }
    }


}
