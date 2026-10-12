package com.viajesazo.turismo_backend.dto.request;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
//sacamos la direccion y dejamos la ciudad de interes

public record ViajeRequest (
    
    @NotBlank(message ="El nombre del viaje no puede estar vacío")
    String nombre,

    @NotNull(message = "La ubicación de interés no puede estar vacía")
    @Valid
    UbicacionRequest ubicacion,

    @NotNull(message = "El rango de interés no puede estar vacío")
    double rangoInteresKm,

    @NotNull(message = "La fecha de inicio no puede estar vacía") 
    LocalDate fechaInicio,
    
    @NotNull(message = "La fecha de finalización no puede estar vacía")
    LocalDate fechaFin,

    TipoRitmo ritmo,

    List<InteresCategoria> interesesCategoria,

    String usuario
    
    ) {
    //JsonIgnore para que no se tenga en cuenta en la validación de fechas y no se envíe en la respuesta
    @JsonIgnore
    //AssertTrue es para validar que la fecha de finalización no sea anterior a la fecha de inicio
    @AssertTrue(
        message = "La fecha de finalización no puede ser anterior a la fecha de inicio"
    )
    public boolean isOrdenFechasValido() {
        // Los valores ausentes los valida @NotNull.
        if (fechaInicio == null || fechaFin == null) {
            return true;
        }

        return !fechaFin.isBefore(fechaInicio);
    }
}