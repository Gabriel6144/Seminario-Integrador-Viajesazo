package com.viajesazo.turismo_backend.dto.response;

public record PropuestaPopularResponse(
		Long propuestaId,
		String nombre,
		String tipo,
		long inscriptos
) {
}
