package com.viajesazo.turismo_backend.dto.response;

import java.time.LocalDate;
import java.time.LocalTime;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRegistro;

public record CircuitoItemResponse(
        Long propuestaId,
        String propuestaNombre,
        String descripcion,
        InteresCategoria categoria,
        TipoRegistro tipo,
        LocalDate fecha,
        int orden,
        LocalTime horaInicio,
        LocalTime horaFin,
        double trasladoKm,
        int trasladoMinutos,
        boolean disponible,
        String motivoNoDisponible) {
}
