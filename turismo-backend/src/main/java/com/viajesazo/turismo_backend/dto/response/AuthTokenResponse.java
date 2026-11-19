package com.viajesazo.turismo_backend.dto.response;

public record AuthTokenResponse(
		String accessToken,
		String tokenType,
		long expiresInSeconds,
		UsuarioResponse usuario
) {
}
