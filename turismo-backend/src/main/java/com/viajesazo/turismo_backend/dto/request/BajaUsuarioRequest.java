package com.viajesazo.turismo_backend.dto.request;

import jakarta.validation.constraints.NotBlank;

/** Body de la baja de cuenta: la contraseña confirma que quien da de baja es el dueño. */
public record BajaUsuarioRequest(

		@NotBlank(message = "la contraseña es obligatoria")
		String contrasena) {
}
