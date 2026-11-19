package com.viajesazo.turismo_backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
		@NotBlank(message = "el email es obligatorio")
		@Email(message = "el email no tiene un formato válido")
		String email,

		@NotBlank(message = "la contraseña es obligatoria")
		@Size(max = 72, message = "la contraseña no puede superar los 72 caracteres")
		String contrasena
) {
}
