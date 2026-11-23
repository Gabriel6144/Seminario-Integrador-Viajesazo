package com.viajesazo.turismo_backend.dto.request;

import jakarta.validation.constraints.NotNull;

public record DescartarAvisoDiaRequest(
		@NotNull(message = "descartado es obligatorio") Boolean descartado) {
}
