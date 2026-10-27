package com.viajesazo.turismo_backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.CircuitStrategy;

public record GeneracionCircuitoResponse(
        LocalDateTime generadoEn,
        CircuitStrategy estrategiaSeleccionada,
        List<CircuitoAlternativaResponse> alternativas,
        boolean distanciasEstimadas,
        String advertencia) {
}
