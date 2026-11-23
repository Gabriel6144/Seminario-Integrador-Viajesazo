package com.viajesazo.turismo_backend.dto.request;

import jakarta.validation.constraints.NotNull;

public record AgregarParadaSugeridaRequest(
		@NotNull(message = "la propuesta es obligatoria") Long propuestaId) {
}
