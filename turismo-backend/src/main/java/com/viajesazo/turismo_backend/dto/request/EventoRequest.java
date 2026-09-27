package com.viajesazo.turismo_backend.dto.request;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.Categoria;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EventoRequest(

		@NotBlank(message = "el nombre es obligatorio") 
		String nombre,

		String descripcion,
		Categoria categoria,
		String localidad,
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
