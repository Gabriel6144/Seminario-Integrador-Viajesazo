package com.viajesazo.turismo_backend.dto.request;

import java.time.LocalDate;
import java.util.List;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRitmo;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Borrador parcial: solo {@code nombre} y {@code pasoActual} son obligatorios.
 * El resto puede venir null/vacío hasta completar el planificador.
 */
public record ViajeBorradorRequest(

    @NotBlank(message = "El nombre del viaje no puede estar vacío")
    @Size(max = 100, message = "El nombre del viaje no puede tener más de 100 caracteres")
    String nombre,

    @Valid
    UbicacionRequest ubicacion,

    @Positive(message = "El rango de interés debe ser mayor a cero")
    Double rangoInteresKm,

    LocalDate fechaInicio,

    LocalDate fechaFin,

    TipoRitmo ritmo,

    @NotNull(message = "El paso actual no puede estar vacío")
    Integer pasoActual,

    List<@NotNull(message = "El interés de categoría no puede ser nulo") InteresCategoria> interesesCategoria,

    List<@Valid DiaRitmoRequest> diasPlan

) {}
