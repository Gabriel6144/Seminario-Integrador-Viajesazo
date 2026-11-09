package com.viajesazo.turismo_backend.exception;

import java.util.List;

/**
 * El viaje no tiene los datos mínimos para generar un circuito. La API responde 422 con la lista
 * de campos faltantes para que el cliente pueda señalarlos.
 */
public class CircuitoDataMissingException extends RuntimeException {

	private final List<String> datosFaltantes;

	public CircuitoDataMissingException(List<String> datosFaltantes) {
		super("faltan datos para generar el circuito: " + String.join(", ", datosFaltantes));
		this.datosFaltantes = List.copyOf(datosFaltantes);
	}

	public List<String> datosFaltantes() {
		return datosFaltantes;
	}

}
