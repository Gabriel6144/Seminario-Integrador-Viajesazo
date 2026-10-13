package com.viajesazo.turismo_backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.EstadoPropuesta;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoAcceso;



public record EventoResponse(
		Long id,
		String nombre,
		String descripcion,
		InteresCategoria categoria,
		TipoAcceso tipoAcceso,
		EstadoPropuesta estadoPropuesta,
		BigDecimal montoEstimado,
		String descripcionArancel,
		String sitioOficial,
		String lugarRecinto,
		String localidad,
		String direccion,
		BigDecimal latitud,
		BigDecimal longitud,
		LocalDate fechaInicio,
		LocalDate fechaFin,
		LocalTime horarioInicio,
		LocalTime horarioFin,
		List<String> imagenes,
		Long publicadorId,
		String publicadorNombre
) {}


