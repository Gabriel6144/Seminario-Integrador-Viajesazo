package com.viajesazo.turismo_backend.controller;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.viajesazo.turismo_backend.dto.response.EventoResponse;
import com.viajesazo.turismo_backend.dto.request.PublicadorRequest;
import com.viajesazo.turismo_backend.dto.response.PublicadorResponse;
import com.viajesazo.turismo_backend.service.EventoService;
import com.viajesazo.turismo_backend.service.PublicadorService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/publicadores")
public class PublicadorController {

	private final PublicadorService publicadorService;
	private final EventoService eventoService;

	public PublicadorController(PublicadorService publicadorService, EventoService eventoService) {
		this.publicadorService = publicadorService;
		this.eventoService = eventoService;
	}

	@PostMapping
	public ResponseEntity<PublicadorResponse> create(@Valid @RequestBody PublicadorRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(publicadorService.create(request));
	}

	@GetMapping("/{id}")
	public PublicadorResponse findById(@PathVariable Long id) {
		return publicadorService.findById(id);
	}

	/**
	 * Listado de todos los publicadores, paginado con {@code ?page=0&size=20}. Orden alfabético
	 * impuesto por el repository. Sin publicadores devuelve una página vacía con 200.
	 */
	@GetMapping
	public PagedModel<PublicadorResponse> findAll(@PageableDefault(size = 20) Pageable pageable) {
		return new PagedModel<>(publicadorService.findAll(pageable));
	}

	/**
	 * US5. Paginado con {@code ?page=0&size=20}; el tope lo fija
	 * {@code spring.data.web.pageable.max-page-size}. El orden por fecha de inicio lo impone el
	 * repository, no el cliente.
	 */
	@GetMapping("/{id}/eventos")
	public PagedModel<EventoResponse> findEventos(@PathVariable Long id,
			@PageableDefault(size = 20) Pageable pageable) {
		return new PagedModel<>(eventoService.findByPublicadorId(id, pageable));
	}

}
