package com.viajesazo.turismo_backend.dto.response;

import java.time.Instant;

public record NotificacionResponse(
		Long id,
		String titulo,
		String cuerpo,
		boolean leida,
		Instant creadaEn,
		Long propuestaId,
		String tipo
) {
}
