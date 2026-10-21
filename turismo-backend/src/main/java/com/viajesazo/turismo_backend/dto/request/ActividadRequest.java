package com.viajesazo.turismo_backend.dto.request;

import java.util.List;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.Modalidad;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoPropuesta;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ActividadRequest(

		@NotBlank(message = "el nombre es obligatorio")
		String nombre,

		String descripcion,
		InteresCategoria categoria,
		Modalidad modalidad,
		TipoPropuesta tipoPropuesta,
		TipoAcceso tipoAcceso,

		@NotBlank(message = "el lugar o recinto es obligatorio")
		String lugarRecinto,

		@NotBlank(message = "la ciudad es obligatoria")
		String localidad,

		@NotBlank(message = "la dirección exacta es obligatoria")
		String direccion,

		@Positive(message = "la duración debe ser mayor a cero")
		int duracionMinutos,

		List<@Valid DisponibilidadRequest> disponibilidades,

		List<@NotBlank(message = "las URLs de imagen no pueden estar vacías")
		String> imagenes,

		@NotNull(message = "el publicador es obligatorio")
		Long publicadorId
) {}
