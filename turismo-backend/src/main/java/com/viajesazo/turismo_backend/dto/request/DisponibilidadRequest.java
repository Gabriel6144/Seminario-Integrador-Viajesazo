package com.viajesazo.turismo_backend.dto.request;

import java.time.DayOfWeek;
import java.time.LocalTime;

import jakarta.validation.constraints.NotNull;

public record DisponibilidadRequest(

		@NotNull(message = "el día de la semana es obligatorio")
		DayOfWeek diaSemana,

		@NotNull(message = "la hora de inicio es obligatoria")
		LocalTime horaInicio,

		@NotNull(message = "la hora de fin es obligatoria")
		LocalTime horaFin
) {}
