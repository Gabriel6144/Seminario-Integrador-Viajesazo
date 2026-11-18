package com.viajesazo.turismo_backend.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.model.RefreshToken;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.repository.RefreshTokenRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

	private final RefreshTokenRepository refreshTokenRepository;

	@Value("${app.jwt.refresh-token-days}")
	private long refreshTokenDays;

	@Transactional
	public String create(Usuario usuario, String userAgent, String ipAddress) {
		String raw = UUID.randomUUID().toString();
		RefreshToken token = RefreshToken.builder()
				.usuario(usuario)
				.tokenHash(hash(raw))
				.expiresAt(Instant.now().plus(refreshTokenDays, ChronoUnit.DAYS))
				.revoked(false)
				.userAgent(truncate(userAgent, 200))
				.ipAddress(truncate(ipAddress, 45))
				.build();
		refreshTokenRepository.save(token);
		return raw;
	}

	/**
	 * Rota el refresh token: revoca el actual y emite uno nuevo para el mismo usuario.
	 *
	 * @return el nuevo valor opaco en claro
	 */
	@Transactional
	public RotatedRefreshToken rotate(String rawToken, String userAgent, String ipAddress) {
		RefreshToken existing = refreshTokenRepository.findByTokenHashAndRevokedFalse(hash(rawToken))
				.orElseThrow(() -> new BusinessRuleException("refresh token inválido o revocado"));
		if (existing.getExpiresAt().isBefore(Instant.now())) {
			existing.setRevoked(true);
			refreshTokenRepository.save(existing);
			throw new BusinessRuleException("refresh token expirado");
		}
		existing.setRevoked(true);
		refreshTokenRepository.save(existing);
		String next = create(existing.getUsuario(), userAgent, ipAddress);
		return new RotatedRefreshToken(next, existing.getUsuario());
	}

	@Transactional
	public void revoke(String rawToken) {
		refreshTokenRepository.findByTokenHashAndRevokedFalse(hash(rawToken)).ifPresent(token -> {
			token.setRevoked(true);
			refreshTokenRepository.save(token);
		});
	}

	@Transactional
	public void revokeAllForUsuario(Long usuarioId) {
		refreshTokenRepository.revokeAllActiveForUsuario(usuarioId);
	}

	public static String hash(String raw) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] hashed = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(hashed);
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("SHA-256 no disponible", e);
		}
	}

	private static String truncate(String value, int max) {
		if (value == null) {
			return null;
		}
		return value.length() <= max ? value : value.substring(0, max);
	}

	public record RotatedRefreshToken(String rawToken, Usuario usuario) {
	}

}
