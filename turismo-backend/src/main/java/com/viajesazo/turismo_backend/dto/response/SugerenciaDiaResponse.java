package com.viajesazo.turismo_backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.MotivoSugerencia;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoRegistro;

public record SugerenciaDiaResponse(
		Long propuestaId,
		String nombre,
		TipoRegistro tipo,
		InteresCategoria categoria,
		MotivoSugerencia motivoSugerencia,
		String textoMotivo,
		LocalTime horaInicio,
		LocalTime horaFin,
		double trasladoKm,
		int trasladoMinutos,
		Integer duracionMinutos,
		List<String> imagenes,
		String ciudad,
		String localidad,
		String direccion,
		String lugarRecinto,
		BigDecimal latitud,
		BigDecimal longitud,
		TipoAcceso tipoAcceso,
		BigDecimal montoEstimado,
		String descripcionArancel,
		String sitioOficial,
		String descripcion) {
}
