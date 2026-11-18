package com.viajesazo.turismo_backend.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

	private final SecretKey secretKey;
	private final long accessTokenMinutes;
	private final String issuer;
	private final String audience;

	public JwtService(
			@Value("${app.jwt.secret}") String secret,
			@Value("${app.jwt.access-token-minutes}") long accessTokenMinutes,
			@Value("${app.jwt.issuer}") String issuer,
			@Value("${app.jwt.audience}") String audience) {
		this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
		this.accessTokenMinutes = accessTokenMinutes;
		this.issuer = issuer;
		this.audience = audience;
	}

	public String createAccessToken(UsuarioPrincipal principal) {
		Instant now = Instant.now();
		Instant expires = now.plusSeconds(accessTokenMinutes * 60);
		List<String> roles = principal.getAuthorities().stream()
				.map(a -> a.getAuthority().replaceFirst("^ROLE_", ""))
				.toList();
		return Jwts.builder()
				.issuer(issuer)
				.audience().add(audience).and()
				.subject(String.valueOf(principal.getId()))
				.claim("email", principal.getEmail())
				.claim("roles", roles)
				.issuedAt(Date.from(now))
				.expiration(Date.from(expires))
				.signWith(secretKey)
				.compact();
	}

	public long getAccessTokenExpiresInSeconds() {
		return accessTokenMinutes * 60;
	}

	public Claims parseClaims(String token) {
		try {
			return Jwts.parser()
					.verifyWith(secretKey)
					.requireIssuer(issuer)
					.requireAudience(audience)
					.build()
					.parseSignedClaims(token)
					.getPayload();
		} catch (JwtException | IllegalArgumentException ex) {
			throw new JwtException("token JWT inválido o expirado", ex);
		}
	}

	public Long extractUsuarioId(String token) {
		return Long.valueOf(parseClaims(token).getSubject());
	}

}
