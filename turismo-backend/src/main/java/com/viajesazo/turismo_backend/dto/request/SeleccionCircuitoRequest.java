package com.viajesazo.turismo_backend.dto.request;

import com.viajesazo.turismo_backend.model.CircuitStrategy;

import jakarta.validation.constraints.NotNull;

public record SeleccionCircuitoRequest(
        @NotNull(message = "La alternativa del circuito es obligatoria")
        CircuitStrategy estrategia) {
}
