package com.viajesazo.turismo_backend.dto.response;

import java.util.List;

public record AdminDashboardResponse(
		long totalUsuarios,
		long usuariosActivos7d,
		long usuariosActivos30d,
		long nuevosRegistros7d,
		long nuevosRegistros30d,
		long totalTuristas,
		long totalPublicadores,
		long viajesCreados7d,
		long viajesCreados30d,
		List<PropuestaPopularResponse> propuestasPopulares
) {
}
