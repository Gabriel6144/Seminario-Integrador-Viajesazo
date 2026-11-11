package com.viajesazo.turismo_backend.dto.response;

public record UsuarioResponse(
		Long id,
		String nombre,
		String email,
		String telefono
) {
}
