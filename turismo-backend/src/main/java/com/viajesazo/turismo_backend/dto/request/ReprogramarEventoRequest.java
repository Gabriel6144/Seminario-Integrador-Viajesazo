package com.viajesazo.turismo_backend.dto.request;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record ReprogramarEventoRequest(
		@NotNull(message = "la fecha de inicio es obligatoria")
		LocalDate fechaInicio
) {
}
