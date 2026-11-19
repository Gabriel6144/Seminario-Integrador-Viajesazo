package com.viajesazo.turismo_backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.viajesazo.turismo_backend.dto.response.MeGustaResponse;
import com.viajesazo.turismo_backend.service.MeGustaService;

@RestController
@RequestMapping("/api/propuestas/{propuestaId}/me-gusta")
public class MeGustaController {

	private final MeGustaService meGustaService;

	public MeGustaController(MeGustaService meGustaService) {
		this.meGustaService = meGustaService;
	}

	@GetMapping
	public MeGustaResponse estado(@PathVariable Long propuestaId) {
		return meGustaService.estado(propuestaId);
	}

	@PostMapping
	public ResponseEntity<MeGustaResponse> darMeGusta(@PathVariable Long propuestaId) {
		MeGustaResponse body = meGustaService.darMeGusta(propuestaId);
		return ResponseEntity.status(HttpStatus.CREATED).body(body);
	}

	@DeleteMapping
	public ResponseEntity<Void> quitarMeGusta(@PathVariable Long propuestaId) {
		meGustaService.quitarMeGusta(propuestaId);
		return ResponseEntity.noContent().build();
	}
}
