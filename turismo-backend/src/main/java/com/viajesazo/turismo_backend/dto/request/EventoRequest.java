package com.viajesazo.turismo_backend.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.Modalidad;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoPropuesta;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record EventoRequest(

		@NotBlank(message = "el nombre es obligatorio") 
		@Size(max = 150, message = "el nombre no puede superar los 150 caracteres")
		String nombre,

		@NotBlank(message = "la descripción es obligatoria")
		@Size(max = 1000, message = "la descripción no puede superar los 1000 caracteres")
		String descripcion,

		@NotNull(message = "la categoría es obligatoria")
		InteresCategoria categoria,

		Modalidad modalidad,

		@NotNull(message = "el tipo de propuesta es obligatorio")
		TipoPropuesta tipoPropuesta,

		TipoAcceso tipoAcceso,

		@PositiveOrZero(message = "el monto estimado no puede ser negativo") 
		BigDecimal montoEstimado,

		@Size(max = 1000, message = "la descripción del arancel no puede superar los 1000 caracteres")
		String descripcionArancel,

		@Size(max = 500, message = "el link al sitio oficial no puede superar los 500 caracteres")
		@Pattern(regexp = "^https?://.+", message = "el link al sitio oficial debe ser una URL http(s)") 
		String sitioOficial,

		@NotBlank(message = "el lugar o recinto es obligatorio") 
		@Size(max = 200, message = "el lugar o recinto no puede superar los 200 caracteres")
		String lugarRecinto,

		@NotBlank(message = "la ciudad es obligatoria") 
		@Size(max = 120, message = "la ciudad no puede superar los 120 caracteres")
		String localidad,

		@NotBlank(message = "la dirección exacta es obligatoria") 
		@Size(max = 250, message = "la dirección no puede superar los 250 caracteres")
		String direccion,

		@NotNull(message = "la fecha de inicio es obligatoria") 
		LocalDate fechaInicio,

		@NotNull(message = "la fecha de finalización es obligatoria") 
		LocalDate fechaFin,

		@NotNull(message = "el horario de inicio es obligatorio")
		LocalTime horarioInicio,

		@NotNull(message = "el horario de finalización es obligatorio")
		LocalTime horarioFin,

		@NotEmpty(message = "el evento debe tener al menos una imagen")
		List<@NotBlank(message = "las URLs de imagen no pueden estar vacías")
		@Size(max = 500, message = "las URLs de imagen no pueden superar los 500 caracteres")
		String> imagenes,

		// Opcional: un PUBLICADOR lo deriva del JWT. Un ADMIN lo indica explícitamente.
		Long publicadorId) {}
