package com.viajesazo.turismo_backend.dto.response;

/** Contadores del listado de propuestas respetando los filtros activos (sin la píldora de tipo). */
public record PropuestaResumenContadoresResponse(
		long total,
		long eventos,
		long actividades) {
}
