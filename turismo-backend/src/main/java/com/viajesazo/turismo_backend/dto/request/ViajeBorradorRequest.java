package com.viajesazo.turismo_backend.dto.request;

import java.time.LocalDate;
import java.util.List;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRitmo;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record ViajeBorradorRequest(

    String nombre,

    @Valid
    UbicacionRequest ubicacion,

    @Positive(message = "El rango de interés debe ser mayor a cero")
    Double rangoInteresKm,

    LocalDate fechaInicio,

    LocalDate fechaFin,

    TipoRitmo ritmo,

    List<InteresCategoria> interesesCategoria,

    Integer pasoActual,

    @NotBlank(message = "El turista no puede estar vacío")
    String usuario

) {}
