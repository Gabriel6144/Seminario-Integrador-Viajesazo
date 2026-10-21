package com.viajesazo.turismo_backend.model;

/**
 * Nombres válidos para {@link EstadoPropuesta}. El estado persiste como entidad porque tiene
 * descripción propia, pero las reglas de transición viven acá para no repetir strings mágicos.
 */
public enum NombreEstado {
	INICIADO,
	REPROGRAMADO,
	CANCELADO,
	FINALIZADO;

	/**
	 * Un estado terminal ya no admite ediciones ni nuevas transiciones. CANCELADO y FINALIZADO
	 * son el final del ciclo de vida de la propuesta.
	 */
	public boolean esTerminal() {
		return this == CANCELADO || this == FINALIZADO;
	}

	/**
	 * Transiciones acordadas:
	 * <ul>
	 * <li>INICIADO → REPROGRAMADO, CANCELADO, FINALIZADO</li>
	 * <li>REPROGRAMADO → REPROGRAMADO, CANCELADO, FINALIZADO (se puede reprogramar más de una vez)</li>
	 * <li>CANCELADO y FINALIZADO no tienen salida</li>
	 * </ul>
	 */
	public boolean puedeTransicionarA(NombreEstado destino) {
		if (destino == null) {
			return false;
		}
		return switch (this) {
			case INICIADO -> destino == REPROGRAMADO || destino == CANCELADO || destino == FINALIZADO;
			case REPROGRAMADO -> destino == REPROGRAMADO || destino == CANCELADO || destino == FINALIZADO;
			case CANCELADO, FINALIZADO -> false;
		};
	}

	public static NombreEstado desde(String nombre) {
		if (nombre == null) {
			throw new IllegalStateException("La propuesta no tiene estado asignado");
		}
		try {
			return valueOf(nombre);
		} catch (IllegalArgumentException ex) {
			throw new IllegalStateException("Estado de propuesta desconocido: " + nombre, ex);
		}
	}
}
