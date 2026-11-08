package com.viajesazo.turismo_backend.dto.request;

import java.time.LocalDate;
import java.util.List;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ViajeRequest(

    @NotBlank(message = "El nombre del viaje no puede estar vacío")
    @Size(max = 100, message = "El nombre del viaje no puede tener más de 100 caracteres")
    String nombre,

    @NotNull(message = "La ubicación de interés no puede estar vacía")
    @Valid
    UbicacionRequest ubicacion,

    @Positive(message = "El rango de interés debe ser mayor a cero")
    double rangoInteresKm,

    @NotNull(message = "La fecha de inicio no puede estar vacía")
    LocalDate fechaInicio,

    @NotNull(message = "La fecha de finalización no puede estar vacía")
    LocalDate fechaFin,

    @NotNull(message = "El ritmo del viaje no puede estar vacío")
    TipoRitmo ritmo,

    @NotEmpty (message = "La lista de intereses de categoría no puede estar vacía")
    List<@NotNull(message = "El interés de categoría no puede ser nulo") InteresCategoria> intereses,
    
    @NotBlank(message = "El turista no puede estar vacío")
    String usuario

) {}
