package com.viajesazo.turismo_backend.model;

/**
 * Discrimina qué clase concreta hay detrás de una propuesta turística. Es el valor que expone la
 * API en el campo {@code tipo}, independiente de {@link TipoPropuesta}, que describe la
 * naturaleza turística (feria, festival, visita guiada, etc.).
 */
public enum TipoRegistro {
	EVENTO,
	ACTIVIDAD
}
