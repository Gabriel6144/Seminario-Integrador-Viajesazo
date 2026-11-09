package com.viajesazo.turismo_backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.CircuitStrategy;

public record CircuitoSeleccionadoResponse(
        Long circuitoId,
        Long viajeId,
        LocalDateTime generadoEn,
        CircuitStrategy estrategia,
        boolean desactualizado,
        List<String> motivosDesactualizacion,
        boolean distanciasEstimadas,
        String advertencia,
        List<DiaCircuitoResponse> dias) {
}
