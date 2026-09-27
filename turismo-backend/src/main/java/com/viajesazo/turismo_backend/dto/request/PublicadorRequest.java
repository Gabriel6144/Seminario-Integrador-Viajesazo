package com.viajesazo.turismo_backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PublicadorRequest(

		@NotBlank(message = "el nombre es obligatorio") String nombre,

		@NotBlank(message = "el email es obligatorio")
		@Email(message = "el email no tiene un formato válido")
		String email,

		String telefono) {
}
