package com.viajesazo.turismo_backend.controller;

import java.time.LocalDate;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.viajesazo.turismo_backend.dto.request.PropuestaFiltro;
import com.viajesazo.turismo_backend.dto.response.PropuestaResumenResponse;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.Modalidad;
import com.viajesazo.turismo_backend.model.NombreEstado;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoPropuesta;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.service.PropuestaQueryService;

/**
 * Listado unificado de propuestas. Todos los filtros son opcionales y se combinan con AND.
 */
@RestController
@RequestMapping("/api/propuestas")
public class PropuestaController {

	private final PropuestaQueryService propuestaQueryService;

	public PropuestaController(PropuestaQueryService propuestaQueryService) {
		this.propuestaQueryService = propuestaQueryService;
	}

	@GetMapping
	public PagedModel<PropuestaResumenResponse> search(
			@RequestParam(required = false) TipoRegistro tipo,
			@RequestParam(required = false) TipoPropuesta tipoPropuesta,
			@RequestParam(required = false) InteresCategoria categoria,
			@RequestParam(required = false) Modalidad modalidad,
			@RequestParam(required = false) TipoAcceso tipoAcceso,
			@RequestParam(required = false) NombreEstado estado,
			@RequestParam(required = false) Long publicadorId,
			@RequestParam(required = false) String localidad,
			@RequestParam(required = false) String q,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
			@PageableDefault(size = 20) Pageable pageable) {
		PropuestaFiltro filtro = new PropuestaFiltro(tipo, tipoPropuesta, categoria, modalidad, tipoAcceso,
				estado, publicadorId, localidad, q, fechaDesde, fechaHasta);
		return new PagedModel<>(propuestaQueryService.search(filtro, pageable));
	}
}
