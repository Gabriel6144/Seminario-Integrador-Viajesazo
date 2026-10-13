package com.viajesazo.turismo_backend.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;

public record EventoRequest(

		@NotBlank(message = "el nombre es obligatorio") 
		String nombre,

		String descripcion,
		InteresCategoria categoria,

		TipoAcceso tipoAcceso,

		@PositiveOrZero(message = "el monto estimado no puede ser negativo") 
		BigDecimal montoEstimado,

		String descripcionArancel,

		@Pattern(regexp = "^https?://.+", message = "el link al sitio oficial debe ser una URL http(s)") 
		String sitioOficial,

		@NotBlank(message = "el lugar o recinto es obligatorio") 
		String lugarRecinto,

		@NotBlank(message = "la ciudad es obligatoria") 
		String localidad,

		@NotBlank(message = "la dirección exacta es obligatoria") 
		String direccion,

		@NotNull(message = "la fecha de inicio es obligatoria") 
		LocalDate fechaInicio,

		@NotNull(message = "la fecha de finalización es obligatoria") 
		LocalDate fechaFin,

		LocalTime horarioInicio,
		LocalTime horarioFin,

		List<@NotBlank(message = "las URLs de imagen no pueden estar vacías") 
		String> imagenes,

		@NotNull(message = "el publicador es obligatorio") 
		Long publicadorId
) {}
