package com.viajesazo.turismo_backend.dto.response;

import java.time.LocalDate;
import java.time.LocalTime;

import com.viajesazo.turismo_backend.model.Modalidad;

public record PublicadorAgendaItemResponse(
		Long propuestaId,
		String nombre,
		String tipo,
		LocalDate fechaInicio,
		LocalDate fechaFin,
		Modalidad modalidad,
		String imagenUrl,
		LocalTime horarioInicio,
		LocalTime horarioFin,
		String descripcion
) {
}
