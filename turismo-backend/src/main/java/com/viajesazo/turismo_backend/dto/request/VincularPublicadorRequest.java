package com.viajesazo.turismo_backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record VincularPublicadorRequest(
		@NotNull(message = "el publicadorId es obligatorio")
		@Positive(message = "el publicadorId debe ser positivo")
		Long publicadorId
) {
}
