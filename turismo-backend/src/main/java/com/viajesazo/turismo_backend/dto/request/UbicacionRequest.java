package com.viajesazo.turismo_backend.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UbicacionRequest(

    @NotNull(message = "La latitud es obligatoria")
    @DecimalMin(
        value = "-90",
        message = "La latitud debe ser mayor o igual a -90"
    )
    @DecimalMax(
        value = "90",
        message = "La latitud debe ser menor o igual a 90"
    )
    BigDecimal latitud,

    @NotNull(message = "La longitud es obligatoria")
    @DecimalMin(
        value = "-180",
        message = "La longitud debe ser mayor o igual a -180"
    )
    @DecimalMax(
        value = "180",
        message = "La longitud debe ser menor o igual a 180"
    )
    BigDecimal longitud,

    @NotBlank(message = "La ciudad de interés es obligatoria")
    @Size(
        max = 150,
        message = "La ciudad de interés no puede superar los 150 caracteres"
    )
    String ciudadDeInteres,

    @Size(
        max = 150,
        message = "La localidad no puede superar los 150 caracteres"
    )
    String localidad
) {
}
