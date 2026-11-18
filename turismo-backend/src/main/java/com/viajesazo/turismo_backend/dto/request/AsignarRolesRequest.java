package com.viajesazo.turismo_backend.dto.request;

import com.viajesazo.turismo_backend.model.Rol;

import jakarta.validation.constraints.NotNull;

/** Asigna el rol único de la cuenta (una cuenta = un rol). */
public record AsignarRolesRequest(
		@NotNull(message = "debe indicar el rol")
		Rol rol
) {
}
