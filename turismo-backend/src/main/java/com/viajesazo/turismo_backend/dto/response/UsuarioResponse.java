package com.viajesazo.turismo_backend.dto.response;

import java.util.Set;

import com.viajesazo.turismo_backend.model.Rol;

public record UsuarioResponse(
		Long id,
		String nombre,
		String email,
		String telefono,
		Set<Rol> roles,
		Long publicadorId
) {
}
