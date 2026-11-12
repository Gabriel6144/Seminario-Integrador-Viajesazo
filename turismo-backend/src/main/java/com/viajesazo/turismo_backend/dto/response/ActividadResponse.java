package com.viajesazo.turismo_backend.dto.response;

import java.math.BigDecimal;
import java.util.List;

import com.viajesazo.turismo_backend.model.EstadoPropuesta;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.Modalidad;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoPropuesta;
import com.viajesazo.turismo_backend.model.TipoRegistro;

public record ActividadResponse(
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
		int duracionMinutos,
		List<DisponibilidadResponse> disponibilidades,
		List<String> imagenes,
		Long publicadorId,
		String publicadorNombre
) {}
