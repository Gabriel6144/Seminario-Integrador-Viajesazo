package com.viajesazo.turismo_backend.dto.response;

import java.util.List;

public record PublicadorDashboardResponse(
		long totalEventos,
		long totalActividades,
		long totalPropuestas,
		long proximas7d,
		List<PropuestaInscriptosResponse> inscriptosPorPropuesta
) {
}
