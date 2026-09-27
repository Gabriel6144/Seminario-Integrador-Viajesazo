package com.viajesazo.turismo_backend.exception;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.validation.ConstraintViolationException;

import lombok.RequiredArgsConstructor;

@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

	private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	private final Clock clock;

	@ExceptionHandler(ResourceNotFoundException.class)
	public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
		return build(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler(BusinessRuleException.class)
	public ResponseEntity<ErrorResponse> handleBusinessRule(BusinessRuleException ex) {
		return build(HttpStatus.BAD_REQUEST, ex.getMessage());
	}

	/** Violaciones del {@code @Valid} sobre el body de la petición. */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
		String detail = ex.getBindingResult().getFieldErrors().stream()
				.map(error -> error.getField() + ": " + error.getDefaultMessage())
				.collect(Collectors.joining("; "));
		return build(HttpStatus.BAD_REQUEST, detail);
	}

	/**
	 * Violaciones sobre path variables y query params, que Spring solo evalúa si el controller
	 * está anotado con {@code @Validated}. Sin este handler, un id con formato inválido caería
	 * en el catch-all y respondería 500 en lugar de 400.
	 */
	@ExceptionHandler(ConstraintViolationException.class)
	public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
		String detail = ex.getConstraintViolations().stream()
				.map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
				.collect(Collectors.joining("; "));
		return build(HttpStatus.BAD_REQUEST, detail);
	}

	/** JSON mal formado, categoría inexistente, fecha con formato inválido. */
	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex) {
		return build(HttpStatus.BAD_REQUEST, "el cuerpo de la petición no es válido o tiene un formato incorrecto");
	}

	/**
	 * Violación de integridad al escribir. El único {@code UNIQUE} del esquema es
	 * {@code publicador.email}, así que en la práctica esto es un email repetido que se coló por la
	 * carrera de dos altas simultáneas: las dos pasan el pre-chequeo de
	 * {@code PublicadorService} y sólo la segunda rompe la constraint.
	 *
	 * <p>Sin este handler caería en el catch-all y el cliente recibiría un 500 genérico, cuando
	 * lo único que hay que corregir es un campo del formulario.
	 *
	 * <p>El mensaje es fijo a propósito. {@code ex.getMessage()} trae el SQL de la sentencia y los
	 * valores de la fila, y eso no sale del servidor; el detalle va al log, igual que en el
	 * catch-all.
	 */
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ErrorResponse> handleIntegrityViolation(DataIntegrityViolationException ex) {
		logger.warn("Violación de integridad al escribir: probablemente email duplicado", ex);
		return build(HttpStatus.BAD_REQUEST, "ya existe un publicador con ese email");
	}

	/**
	 * Cualquier otra cosa ya es un error del servidor. Se responde 500 sin filtrar el mensaje
	 * de la excepción: podría traer fragmentos de SQL o rutas del servidor. El detalle va al
	 * log, que es donde lo tiene que buscar quien depura.
	 */
	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> handleUnexpectedError(Exception ex) {
		logger.error("Error no controlado al atender una petición", ex);
		return build(HttpStatus.INTERNAL_SERVER_ERROR, "ocurrió un error inesperado en el servidor");
	}

	private ResponseEntity<ErrorResponse> build(HttpStatus status, String message) {
		ErrorResponse body = new ErrorResponse(status.value(), status.getReasonPhrase(), message,
				LocalDateTime.now(clock));
		return ResponseEntity.status(status).body(body);
	}

}
