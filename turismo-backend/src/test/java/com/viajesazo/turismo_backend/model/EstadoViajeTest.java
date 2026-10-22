package com.viajesazo.turismo_backend.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class EstadoViajeTest {

	private static final Map<EstadoViaje, Set<EstadoViaje>> PERMITIDAS = Map.of(
			EstadoViaje.BORRADOR, EnumSet.of(EstadoViaje.PLANIFICADO, EstadoViaje.CANCELADO),
			EstadoViaje.PLANIFICADO, EnumSet.of(EstadoViaje.EN_CURSO, EstadoViaje.CANCELADO),
			EstadoViaje.EN_CURSO, EnumSet.of(EstadoViaje.FINALIZADO),
			EstadoViaje.CANCELADO, EnumSet.noneOf(EstadoViaje.class),
			EstadoViaje.FINALIZADO, EnumSet.noneOf(EstadoViaje.class));

	@Test
	@DisplayName("solo permite las transiciones acordadas")
	void allowsOnlyAgreedTransitions() {
		for (EstadoViaje origen : EstadoViaje.values()) {
			for (EstadoViaje destino : EstadoViaje.values()) {
				assertThat(origen.puedeTransicionarA(destino))
						.as("%s -> %s", origen, destino)
						.isEqualTo(PERMITIDAS.get(origen).contains(destino));
			}
		}
	}

	@Test
	@DisplayName("un destino nulo no es una transición válida")
	void rejectsNullDestination() {
		assertThat(EstadoViaje.BORRADOR.puedeTransicionarA(null)).isFalse();
	}

	@Test
	@DisplayName("CANCELADO y FINALIZADO son terminales")
	void identifiesTerminalStates() {
		assertThat(EstadoViaje.CANCELADO.esTerminal()).isTrue();
		assertThat(EstadoViaje.FINALIZADO.esTerminal()).isTrue();
		assertThat(EstadoViaje.BORRADOR.esTerminal()).isFalse();
		assertThat(EstadoViaje.PLANIFICADO.esTerminal()).isFalse();
		assertThat(EstadoViaje.EN_CURSO.esTerminal()).isFalse();
	}
}
