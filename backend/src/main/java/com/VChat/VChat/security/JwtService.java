package com.VChat.VChat.security;


import com.VChat.VChat.model.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtService {

    @Value("${jwt.secretkey}")
    private String jwtSecretKey;

    private SecretKey getSecretKey(){return Keys.hmacShaKeyFor(jwtSecretKey.getBytes(StandardCharsets.UTF_8));}

    public String generateToken(String username){
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis()+1000*60+10))
                .signWith(getSecretKey())
                .compact();
    }


}
