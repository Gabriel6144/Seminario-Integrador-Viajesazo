package com.viajesazo.turismo_backend.dto.response;

import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import java.time.LocalDate;
import java.util.List;

public record ViajeResponse(
    Long id,
    String nombre,
    UbicacionResponse ubicacion,
    Double rangoInteresKm,
    LocalDate fechaInicio,
    LocalDate fechaFin,
    TipoRitmo ritmo,
    List<InteresCategoria> interesesCategoria,
    EstadoViaje estado,
    Integer pasoActual,
    String usuario

) {}
