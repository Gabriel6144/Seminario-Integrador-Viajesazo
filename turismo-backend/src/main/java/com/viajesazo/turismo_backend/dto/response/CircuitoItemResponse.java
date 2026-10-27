package com.viajesazo.turismo_backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoAcceso;
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
        String motivoNoDisponible,
        List<String> imagenes,
        String ciudad,
        String localidad,
        String direccion,
        String lugarRecinto,
        BigDecimal latitud,
        BigDecimal longitud,
        TipoAcceso tipoAcceso,
        BigDecimal montoEstimado,
        String descripcionArancel,
        String sitioOficial,
        Integer duracionMinutos) {
}
