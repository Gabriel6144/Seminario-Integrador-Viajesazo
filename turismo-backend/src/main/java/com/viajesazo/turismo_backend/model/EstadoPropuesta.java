package com.viajesazo.turismo_backend.model;

/**
 * Estado de la propuesta del evento. Se inicializa en {@link #INICIADO} al registrar el evento;
 * las transiciones las aplican las reglas de negocio (todavía sin definir).
 */
public enum EstadoPropuesta {
	INICIADO,
	REPROGRAMADO,
	CANCELADO,
	FINALIZADO
}
