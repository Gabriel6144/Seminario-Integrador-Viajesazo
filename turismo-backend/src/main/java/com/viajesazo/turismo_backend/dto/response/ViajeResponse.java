package com.viajesazo.turismo_backend.dto.response;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import java.time.LocalDate;
import java.util.List;

public record ViajeResponse (
    String nombre,
    UbicacionResponse ubicacion,
    double rangoInteresKm,
    LocalDate fechaInicio,
    LocalDate fechaFin,
    TipoRitmo ritmo,
    List<InteresCategoria> interesesCategoria,
    String usuario

) {}
