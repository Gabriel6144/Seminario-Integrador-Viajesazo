package com.viajesazo.turismo_backend.controller;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.viajesazo.turismo_backend.dto.request.ActividadRequest;
import com.viajesazo.turismo_backend.dto.response.ActividadResponse;
import com.viajesazo.turismo_backend.service.ActividadService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/actividades")
public class ActividadController {

	private final ActividadService actividadService;

	public ActividadController(ActividadService actividadService) {
		this.actividadService = actividadService;
	}

	@PostMapping
	public ResponseEntity<ActividadResponse> create(@Valid @RequestBody ActividadRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(actividadService.create(request));
	}

	@PutMapping("/{id}")
	public ActividadResponse update(@PathVariable Long id, @Valid @RequestBody ActividadRequest request) {
		return actividadService.update(id, request);
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable Long id) {
		actividadService.delete(id);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/{id}")
	public ActividadResponse findById(@PathVariable Long id) {
		return actividadService.findById(id);
	}

	@GetMapping
	public PagedModel<ActividadResponse> findAll(@PageableDefault(size = 20) Pageable pageable) {
		return new PagedModel<>(actividadService.findAll(pageable));
	}
}
