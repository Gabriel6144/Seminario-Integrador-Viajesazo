package com.viajesazo.turismo_backend.exception;

/**
 * Una invariante del agregado no se cumple. A diferencia de {@link BusinessRuleException}, que
 * describe un dato de entrada inválido, esta excepción señala que el estado resultante de la
 * entidad sería inconsistente. La API la traduce a 422 (Unprocessable Entity).
 */
public class InvariantViolationException extends RuntimeException {

	public InvariantViolationException(String message) {
		super(message);
	}

}
