package com.viajesazo.turismo_backend.dto.request;

import java.time.LocalDate;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record DiaRitmoRequest(
		@NotNull(message = "La fecha del día no puede estar vacía")
		LocalDate fecha,

		@Min(value = 0, message = "La cantidad de eventos no puede ser negativa")
		int cantidadEventos,

		@Min(value = 0, message = "La cantidad de actividades no puede ser negativa")
		int cantidadActividades
) {
}
