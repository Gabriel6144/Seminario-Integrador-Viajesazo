package com.viajesazo.turismo_backend.dto.response;

public record ResumenDiaCircuito(
		int asignadas,
		int minimo,
		int agregadasPorUsuario,
		boolean avisoDescartado,
		String mensaje,
		boolean pendiente,
		boolean puedeCompletar) {
}
