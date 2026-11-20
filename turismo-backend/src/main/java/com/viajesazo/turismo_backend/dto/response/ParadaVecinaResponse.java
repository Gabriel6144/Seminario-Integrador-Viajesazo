package com.viajesazo.turismo_backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalTime;

/**
 * Parada anterior o siguiente a la que se quiere sustituir: define el hueco libre del día.
 */
public record ParadaVecinaResponse(
        String propuestaNombre,
        LocalTime horaInicio,
        LocalTime horaFin,
        BigDecimal latitud,
        BigDecimal longitud) {
}
