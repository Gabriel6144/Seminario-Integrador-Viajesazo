package com.viajesazo.turismo_backend.exception;

/**
 * La operación destruye o reemplaza datos existentes y el cliente no envió la confirmación
 * explícita. La API la traduce a 409 (Conflict).
 */
public class ConfirmationRequiredException extends RuntimeException {

	public ConfirmationRequiredException(String message) {
		super(message);
	}

}
