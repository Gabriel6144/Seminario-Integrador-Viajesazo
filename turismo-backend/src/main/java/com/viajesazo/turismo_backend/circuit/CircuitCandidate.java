package com.viajesazo.turismo_backend.circuit;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRegistro;

public record CircuitCandidate(
        Long id,
        String name,
        TipoRegistro type,
        InteresCategoria category,
        double latitude,
        double longitude,
        List<TimeSlot> slots) {

    public record TimeSlot(LocalDate date, LocalTime start, LocalTime end) {
    }
}
