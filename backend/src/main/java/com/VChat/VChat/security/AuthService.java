package com.VChat.VChat.security;

import com.VChat.VChat.dto.LoginDto;
import com.VChat.VChat.dto.LoginResponseDto;
import com.VChat.VChat.dto.SignupDto;
import com.VChat.VChat.model.Meeting;
import com.VChat.VChat.model.User;
import com.VChat.VChat.repo.MeetingRepo;
import com.VChat.VChat.repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepo userRepo;

    @Autowired
    private final PasswordEncoder passwordEncoder;

    private final JwtService jwtService;
    private final MeetingRepo meetingRepo;

    public LoginResponseDto login(LoginDto loginDto) {
        User user = userRepo.findByUsername(loginDto.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(loginDto.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        String token = jwtService.generateToken(loginDto.getUsername());
        user.setToken(token);
        userRepo.save(user);

        return new LoginResponseDto(token);
    }

    public ResponseEntity<String> registry(SignupDto signupDto) {
        if (userRepo.findByUsername(signupDto.getUsername()).isPresent()) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT) // 409
                    .body("User already exists");
        }

        User newUser = User.builder()
                .name(signupDto.getName())
                .username(signupDto.getUsername())
                .password(passwordEncoder.encode(signupDto.getPassword()))
                .build();

        userRepo.save(newUser);

        return ResponseEntity.status(HttpStatus.CREATED).body("User Created!");
    }
    public List<Meeting> getUserHistory(String token) {
        User user = userRepo.findByToken(token)
                .orElseThrow(() -> new RuntimeException("User not found with token: " + token));

        return meetingRepo.findByUserId(user.getId());
    }

    public void addToHistory(String token, String meetingCode) {
        User user = userRepo.findByToken(token)
                .orElseThrow(() -> new RuntimeException("User not found with token: " + token));

        meetingRepo.save(
                Meeting.builder()
                        .date(new Date())
                        .meetingCode(meetingCode)
                        .user(user)
                        .build()
        );
    }
}
