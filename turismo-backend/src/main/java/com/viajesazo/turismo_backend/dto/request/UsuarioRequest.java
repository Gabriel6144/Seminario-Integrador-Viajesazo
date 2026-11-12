package com.viajesazo.turismo_backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UsuarioRequest(

		@NotBlank(message = "el nombre es obligatorio")
		@Size(max = 120, message = "el nombre no puede superar los 120 caracteres")
		String nombre,

		@NotBlank(message = "el email es obligatorio")
		@Email(message = "el email no tiene un formato válido")
		@Size(max = 180, message = "el email no puede superar los 180 caracteres")
		String email,

		@Size(max = 40, message = "el teléfono no puede superar los 40 caracteres")
		String telefono,

		// Máximo 72: BCrypt ignora lo que pase de 72 bytes, así que una contraseña más larga
		// aceptaría variantes que difieren solo al final.
		@NotBlank(message = "la contraseña es obligatoria")
		@Size(min = 8, max = 72, message = "la contraseña debe tener entre 8 y 72 caracteres")
		String contrasena) {
}
