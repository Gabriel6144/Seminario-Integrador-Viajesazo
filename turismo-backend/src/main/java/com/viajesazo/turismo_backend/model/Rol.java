package com.viajesazo.turismo_backend.model;

/**
 * Roles de autorización (RBAC). Una cuenta tiene <strong>exactamente un</strong> rol.
 * El registro público permite elegir {@link #TURISTA} o {@link #PUBLICADOR};
 * {@link #ADMINISTRADOR} solo se asigna por procedimiento controlado.
 */
public enum Rol {
	TURISTA,
	PUBLICADOR,
	ADMINISTRADOR
}
