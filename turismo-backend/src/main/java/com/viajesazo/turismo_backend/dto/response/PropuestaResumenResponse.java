package com.viajesazo.turismo_backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.EstadoPropuesta;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.Modalidad;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoPropuesta;
import com.viajesazo.turismo_backend.model.TipoRegistro;

/**
 * Vista común de eventos y actividades. Los campos que solo existen en un subtipo quedan en
 * {@code null}: {@code fechaInicio}/{@code fechaFin}/{@code horario*} para actividades y
 * {@code duracionMinutos} para eventos.
 */
public record PropuestaResumenResponse(
		Long id,
		TipoRegistro tipo,
		String nombre,
		String descripcion,
		TipoPropuesta tipoPropuesta,
		InteresCategoria categoria,
		Modalidad modalidad,
		TipoAcceso tipoAcceso,
		EstadoPropuesta estadoPropuesta,
		String lugarRecinto,
		String localidad,
		String direccion,
		BigDecimal latitud,
		BigDecimal longitud,
		LocalDate fechaInicio,
		LocalDate fechaFin,
		LocalTime horarioInicio,
		LocalTime horarioFin,
		Integer duracionMinutos,
		List<String> imagenes,
		Long publicadorId,
		String publicadorNombre
) {}
