package com.viajesazo.turismo_backend.dto.response;

/** Ciudad y localidad distintas para el selector de zona del catálogo. */
public record ZonaResponse(
		String ciudad,
		String localidad) {
}
