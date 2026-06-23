package service.authservice.authservice.config;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import service.authservice.authservice.model.User;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtils {

    @Value("${security.jwt.secret}")
    private String jwtSecret;

    @Value("${security.jwt.access-token-minutes}")
    private long accessTokenMinutes;

    public String generateAccessToken(User user) {
        SecretKey key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
        
        Date issuedAt = new Date();
        Date expiryDate = new Date(issuedAt.getTime() + (accessTokenMinutes * 60 * 1000));

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getUserId());
        claims.put("name", user.getName());
        claims.put("email", user.getEmail());
        claims.put("role", user.getRole().toLowerCase());
        claims.put("approval", user.getApproval());
        claims.put("iat", issuedAt.getTime() / 1000);
        claims.put("exp", expiryDate.getTime() / 1000);
        claims.put("phone", user.getPhone());

        return Jwts.builder()
                .claims(claims)
                .subject(user.getEmail())
                .signWith(key)
                .compact();
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    public String extractEmail(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }
}