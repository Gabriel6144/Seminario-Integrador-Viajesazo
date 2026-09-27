package com.viajesazo.turismo_backend.controller;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.viajesazo.turismo_backend.dto.response.EventoResponse;
import com.viajesazo.turismo_backend.service.EventoService;

@RestController
@RequestMapping("/api/agenda")
public class AgendaController {

	private final EventoService eventoService;

	public AgendaController(EventoService eventoService) {
		this.eventoService = eventoService;
	}

	/** US6. Paginado con {@code ?page=0&size=20}. */
	@GetMapping("/semanal")
	public PagedModel<EventoResponse> findWeekly(@PageableDefault(size = 20) Pageable pageable) {
		return new PagedModel<>(eventoService.findWeeklyAgenda(pageable));
	}

}
