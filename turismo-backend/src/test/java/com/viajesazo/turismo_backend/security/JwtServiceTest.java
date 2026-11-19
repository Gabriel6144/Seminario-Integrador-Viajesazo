package com.viajesazo.turismo_backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

class JwtServiceTest {

	private static final String SECRET = "change-me-viajesazo-dev-secret-key-must-be-long-enough-256bits!!";

	private JwtService jwtService;
	private UsuarioPrincipal principal;

	@BeforeEach
	void setUp() {
		jwtService = new JwtService(SECRET, 15, "viajesazo", "viajesazo-api");
		principal = UsuarioPrincipal.builder()
				.id(7L)
				.email("turista@test.com")
				.password("hash")
				.authorities(List.of(new SimpleGrantedAuthority("ROLE_TURISTA")))
				.activo(true)
				.build();
	}

	@Test
	@DisplayName("emite y valida token con iss, aud, sub y email")
	void createAndParse() {
		String token = jwtService.createAccessToken(principal);
		Claims claims = jwtService.parseClaims(token);

		assertThat(claims.getIssuer()).isEqualTo("viajesazo");
		assertThat(claims.getAudience()).contains("viajesazo-api");
		assertThat(claims.getSubject()).isEqualTo("7");
		assertThat(claims.get("email", String.class)).isEqualTo("turista@test.com");
	}

	@Test
	@DisplayName("rechaza token firmado con otro issuer")
	void rejectsWrongIssuer() {
		JwtService other = new JwtService(SECRET, 15, "otro-issuer", "viajesazo-api");
		String token = other.createAccessToken(principal);

		assertThatThrownBy(() -> jwtService.parseClaims(token)).isInstanceOf(JwtException.class);
	}
}
