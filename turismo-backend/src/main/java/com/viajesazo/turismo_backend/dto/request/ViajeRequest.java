package com.viajesazo.turismo_backend.dto.request;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import com.viajesazo.turismo_backend.model.Ubicacion;
import jakarta.validation.constraints.NotNull;

import jakarta.validation.constraints.NotBlank;


public record ViajeRequest (
    
    @NotBlank(message ="El nombre del viaje no puede estar vacío")
    String nombre,

    @NotBlank(message = "La ciudad de interés no puede estar vacía")
    String ciudadDeInteres,

    BigDecimal latitud,
    BigDecimal longitud,

    @NotNull(message = "El rango de interés no puede estar vacío")
    double rangoInteresKm,

    @NotNull(message = "La fecha de inicio no puede estar vacía") 
    LocalDateTime fechaInicio,
    
    @NotNull(message = "La fecha de finalización no puede estar vacía")
    LocalDateTime fechaFin,

    TipoRitmo ritmo,

    List<InteresCategoria> interesesCategoria,

    String usuario
)
{

}
