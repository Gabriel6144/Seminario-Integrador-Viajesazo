package com.viajesazo.turismo_backend.dto.response;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.InteresCategoria;



public record EventoResponse(
		Long id,
		String nombre,
		String descripcion,
		InteresCategoria categoria,
		String localidad,
		String direccion,
		LocalDate fechaInicio,
		LocalDate fechaFin,
		LocalTime horarioInicio,
		LocalTime horarioFin,
		List<String> imagenes,
		Long publicadorId,
		String publicadorNombre
) {}


