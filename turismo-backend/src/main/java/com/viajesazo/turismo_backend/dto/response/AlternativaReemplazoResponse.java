package com.viajesazo.turismo_backend.dto.response;

import java.time.LocalTime;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRegistro;

public record AlternativaReemplazoResponse(
        Long propuestaId,
        String propuestaNombre,
        TipoRegistro tipo,
        InteresCategoria categoria,
        String ciudad,
        String localidad,
        String direccion,
        LocalTime horaInicio,
        LocalTime horaFin,
        Integer duracionMinutos) {
}
