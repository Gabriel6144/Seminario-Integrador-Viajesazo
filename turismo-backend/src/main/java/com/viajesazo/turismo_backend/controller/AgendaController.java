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
import com.viajesazo.turismo_backend.dto.response.EventoResponse;
import com.viajesazo.turismo_backend.dto.response.PropuestaResumenResponse;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoPropuesta;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.service.PropuestaQueryService;
import com.viajesazo.turismo_backend.service.PropuestaService;

@RestController
@RequestMapping("/api/agenda")
public class AgendaController {

	private final PropuestaService propuestaService;
	private final PropuestaQueryService propuestaQueryService;

	public AgendaController(PropuestaService propuestaService, PropuestaQueryService propuestaQueryService) {
		this.propuestaService = propuestaService;
		this.propuestaQueryService = propuestaQueryService;
	}

	/**
	 * VZ-18. Agenda turística de eventos, paginada con {@code ?page=0&size=20}.
	 *
	 * <p>Todos los filtros son opcionales. Si no se manda {@code fechaDesde}, la ventana
	 * arranca hoy. El detalle de cada evento se consulta en {@code GET /api/eventos/{id}}.
	 */
	@GetMapping
	public PagedModel<PropuestaResumenResponse> searchAgenda(
			@RequestParam(required = false) TipoPropuesta tipoPropuesta,
			@RequestParam(required = false) InteresCategoria categoria,
			@RequestParam(required = false) TipoAcceso tipoAcceso,
			@RequestParam(required = false) String ubicacion,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
			@PageableDefault(size = 20) Pageable pageable) {
		PropuestaFiltro filtro = new PropuestaFiltro(TipoRegistro.EVENTO, tipoPropuesta, categoria, null,
				tipoAcceso, null, null, null, ubicacion, null, fechaDesde, fechaHasta);
		return new PagedModel<>(propuestaQueryService.searchAgenda(filtro, pageable));
	}

	/** US6. Paginado con {@code ?page=0&size=20}. */
	@GetMapping("/semanal")
	public PagedModel<EventoResponse> findWeekly(@PageableDefault(size = 20) Pageable pageable) {
		return new PagedModel<>(propuestaService.findWeeklyAgenda(pageable));
	}

}
