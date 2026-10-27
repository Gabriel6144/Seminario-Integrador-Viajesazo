package com.viajesazo.turismo_backend.dto.response;

import java.util.List;
import java.util.Set;

import com.viajesazo.turismo_backend.model.CircuitStrategy;
import com.viajesazo.turismo_backend.model.InteresCategoria;

public record CircuitoAlternativaResponse(
        CircuitStrategy estrategia,
        List<CircuitoItemResponse> propuestas,
        double distanciaTotalKm,
        double afinidadIntereses,
        Set<InteresCategoria> categoriasCubiertas,
        String advertencia) {
}
