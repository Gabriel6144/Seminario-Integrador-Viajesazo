package com.viajesazo.turismo_backend.exception;

import java.time.LocalDateTime;
import java.util.List;

public record ErrorResponseWithMissingData(int status, String error, String message,
		List<String> datosFaltantes, LocalDateTime timestamp) {
}
