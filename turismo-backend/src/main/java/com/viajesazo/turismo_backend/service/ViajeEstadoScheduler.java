package com.viajesazo.turismo_backend.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Materializa periódicamente las transiciones de estado que dependen de la fecha:
 * PLANIFICADO → EN_CURSO y EN_CURSO → FINALIZADO.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.viajes.transiciones.enabled", havingValue = "true", matchIfMissing = true)
public class ViajeEstadoScheduler {

	private final ViajeService viajeService;

	@Scheduled(
			fixedDelayString = "${app.viajes.transiciones.fixed-delay-ms:60000}",
			initialDelayString = "${app.viajes.transiciones.initial-delay-ms:0}")
	public void aplicarTransiciones() {
		viajeService.aplicarTransicionesAutomaticas();
	}
}
