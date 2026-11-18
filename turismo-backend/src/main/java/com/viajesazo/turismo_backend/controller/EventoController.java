package com.viajesazo.turismo_backend.controller;

import java.time.LocalDate;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.viajesazo.turismo_backend.dto.request.EventoRequest;
import com.viajesazo.turismo_backend.dto.request.ReprogramarEventoRequest;
import com.viajesazo.turismo_backend.dto.response.EventoResponse;
import com.viajesazo.turismo_backend.dto.response.ReprogramarPreviewResponse;
import com.viajesazo.turismo_backend.service.NotificacionService;
import com.viajesazo.turismo_backend.service.PropuestaService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/eventos")
public class EventoController {

	private final PropuestaService propuestaService;
	private final NotificacionService notificacionService;

	public EventoController(PropuestaService propuestaService, NotificacionService notificacionService) {
		this.propuestaService = propuestaService;
		this.notificacionService = notificacionService;
	}

	@PostMapping
	public ResponseEntity<EventoResponse> create(@Valid @RequestBody EventoRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(propuestaService.create(request));
	}

	@PutMapping("/{id}")
	public EventoResponse update(@PathVariable Long id, @Valid @RequestBody EventoRequest request) {
		return propuestaService.update(id, request);
	}

	@GetMapping("/{id}/reprogramar/preview")
	public ReprogramarPreviewResponse previewReprogramar(
			@PathVariable Long id,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio) {
		return notificacionService.previewReprogramacion(id, fechaInicio);
	}

	@PatchMapping("/{id}/reprogramar")
	public EventoResponse reprogramar(@PathVariable Long id,
			@Valid @RequestBody ReprogramarEventoRequest request) {
		return propuestaService.reprogramar(id, request);
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable Long id) {
		propuestaService.delete(id);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/{id}")
	public EventoResponse findById(@PathVariable Long id) {
		return propuestaService.findById(id);
	}

	/**
	 * Listado de todos los eventos, paginado con {@code ?page=0&size=20}. Sin ventana de fechas,
	 * a diferencia de la agenda semanal. Sin eventos devuelve una página vacía con 200.
	 */
	@GetMapping
	public PagedModel<EventoResponse> findAll(@PageableDefault(size = 20) Pageable pageable) {
		return new PagedModel<>(propuestaService.findAll(pageable));
	}

}
