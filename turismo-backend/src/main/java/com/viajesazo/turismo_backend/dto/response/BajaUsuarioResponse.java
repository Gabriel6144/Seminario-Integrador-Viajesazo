package com.viajesazo.turismo_backend.dto.response;

/**
 * Resultado de la baja de cuenta. {@code mensaje} es el aviso de baja exitosa (CA1) y
 * {@code viajesCancelados} cuántos viajes activos se cancelaron con ella (CA5).
 */
public record BajaUsuarioResponse(
		Long id,
		String mensaje,
		int viajesCancelados
) {
}
