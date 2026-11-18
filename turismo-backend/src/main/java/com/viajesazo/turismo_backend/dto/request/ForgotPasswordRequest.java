package com.viajesazo.turismo_backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
		@NotBlank(message = "el email es obligatorio")
		@Email(message = "el email no tiene un formato válido")
		String email
) {
}
