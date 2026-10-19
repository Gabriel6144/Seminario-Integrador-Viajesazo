package com.viajesazo.turismo_backend.model;

/**
 * Tipo de acceso de un evento: gratuito o arancelado. Cuando es {@link #DE_PAGO} el evento
 * lleva monto estimado y link al sitio oficial.
 */
public enum TipoAcceso {
	GRATUITO,
	DE_PAGO
}
