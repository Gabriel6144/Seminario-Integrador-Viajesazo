package com.viajesazo.turismo_backend.dto.response;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Respuesta de "Sustituir parada": el hueco libre del día, las paradas que lo limitan, las opciones
 * ordenadas y las propuestas que no entran (con el motivo). {@code mensaje} solo viene cuando no hay
 * ninguna opción.
 */
public record OpcionesSustitucionResponse(
        LocalDate fecha,
        LocalTime huecoInicio,
        LocalTime huecoFin,
        ParadaVecinaResponse paradaAnterior,
        ParadaVecinaResponse paradaSiguiente,
        List<OpcionSustitucionResponse> opciones,
        List<PropuestaFueraDeHuecoResponse> noEntran,
        String mensaje) {
}
