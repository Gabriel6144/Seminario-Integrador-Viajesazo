package com.viajesazo.turismo_backend.dto.request;

import jakarta.validation.constraints.NotNull;

public record ReemplazoItemCircuitoRequest(
        @NotNull(message = "La propuesta de reemplazo es obligatoria")
        Long propuestaId) {
}
