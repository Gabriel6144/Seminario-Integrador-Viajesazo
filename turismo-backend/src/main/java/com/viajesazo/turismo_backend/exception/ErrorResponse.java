package com.viajesazo.turismo_backend.exception;

import java.time.LocalDateTime;

public record ErrorResponse(int status, String error, String message, LocalDateTime timestamp) {
}
