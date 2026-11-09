package com.viajesazo.turismo_backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.CircuitStrategy;

public record CircuitoResponse(
        LocalDateTime generadoEn,
        CircuitStrategy estrategia,
        CircuitoAlternativaResponse alternativa,
        boolean distanciasEstimadas,
        String advertencia,
        boolean desactualizado,
        List<String> motivosDesactualizacion) {
}
