package com.viajesazo.turismo_backend.dto.response;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record DisponibilidadResponse(
		DayOfWeek diaSemana,
		LocalTime horaInicio,
		LocalTime horaFin
) {}
