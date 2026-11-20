package com.viajesazo.turismo_backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalTime;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRegistro;

/**
 * Una propuesta que puede reemplazar a la parada elegida: entra en el hueco libre del día
 * (entre la parada anterior y la siguiente, con sus traslados) y está dentro del radio del viaje.
 * <p>
 * {@code meGusta}, {@code enIntereses}, {@code distanciaKm} y {@code totalMeGusta} explican por
 * qué aparece y en qué orden: primero lo que el turista marcó con Me gusta, después sus intereses,
 * después lo más cercano a la parada anterior y por último lo más popular.
 */
public record OpcionSustitucionResponse(
        Long propuestaId,
        String propuestaNombre,
        String descripcion,
        TipoRegistro tipo,
        InteresCategoria categoria,
        String imagen,
        String ciudad,
        String localidad,
        String direccion,
        BigDecimal latitud,
        BigDecimal longitud,
        LocalTime horaInicio,
        LocalTime horaFin,
        Integer duracionMinutos,
        boolean meGusta,
        long totalMeGusta,
        boolean enIntereses,
        double distanciaKm,
        int minutosTraslado) {
}
