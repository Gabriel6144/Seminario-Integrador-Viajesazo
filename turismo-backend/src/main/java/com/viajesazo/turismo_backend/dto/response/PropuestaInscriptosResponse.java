package com.viajesazo.turismo_backend.dto.response;

public record PropuestaInscriptosResponse(
		Long propuestaId,
		String nombre,
		String tipo,
		long inscriptos
) {
}
