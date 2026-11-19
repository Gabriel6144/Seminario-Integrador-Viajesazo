package com.viajesazo.turismo_backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.viajesazo.turismo_backend.dto.response.NotificacionResponse;
import com.viajesazo.turismo_backend.service.NotificacionService;

@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionController {

	private final NotificacionService notificacionService;

	public NotificacionController(NotificacionService notificacionService) {
		this.notificacionService = notificacionService;
	}

	@GetMapping
	public List<NotificacionResponse> listarMias() {
		return notificacionService.listarMias();
	}

	@PatchMapping("/{id}/leida")
	public NotificacionResponse marcarLeida(@PathVariable Long id) {
		return notificacionService.marcarLeida(id);
	}
}
