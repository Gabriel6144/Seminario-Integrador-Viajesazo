package com.viajesazo.turismo_backend.dto.request;

import java.time.LocalDate;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.Modalidad;
import com.viajesazo.turismo_backend.model.NombreEstado;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoPropuesta;
import com.viajesazo.turismo_backend.model.TipoRegistro;

public record PropuestaFiltro(
		TipoRegistro tipo,
		TipoPropuesta tipoPropuesta,
		InteresCategoria categoria,
		Modalidad modalidad,
		TipoAcceso tipoAcceso,
		NombreEstado estado,
		Long publicadorId,
		String localidad,
		String q,
		LocalDate fechaDesde,
		LocalDate fechaHasta
) {}
