package com.viajesazo.turismo_backend.circuit;

import java.time.LocalDate;
import java.time.LocalTime;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRegistro;

public record ScheduledProposal(
        Long proposalId,
        String proposalName,
        String description,
        TipoRegistro type,
        InteresCategoria category,
        LocalDate date,
        int order,
        LocalTime start,
        LocalTime end,
        double transferDistanceKm,
        int transferMinutes,
        boolean available,
        String unavailableReason) {
}
