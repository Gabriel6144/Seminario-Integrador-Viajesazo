package com.viajesazo.turismo_backend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.model.Viaje;

@DataJpaTest
class ViajeRepositoryTest {

	private static final String TURISTA = "turista@test.com";
	private static final String OTRO = "otro@test.com";

	@Autowired
	private ViajeRepository viajeRepository;

	@Test
	@DisplayName("VZ-22: lista solo los viajes activos del turista")
	void listsOnlyActiveTripsOfTourist() {
		save("Activo propio", TURISTA, EstadoViaje.PLANIFICADO);
		save("Cancelado propio", TURISTA, EstadoViaje.CANCELADO);
		save("Activo ajeno", OTRO, EstadoViaje.PLANIFICADO);

		Page<Viaje> result = viajeRepository.findByUsuarioAndEstadoNotOrderByFechaInicioAsc(
				TURISTA, EstadoViaje.CANCELADO, PageRequest.of(0, 10));

		assertThat(result.getContent()).extracting(Viaje::getNombre).containsExactly("Activo propio");
	}

	@Test
	@DisplayName("VZ-22: ordena los viajes activos por fecha de inicio")
	void ordersActiveTripsByStartDate() {
		save("Segundo", TURISTA, EstadoViaje.PLANIFICADO, LocalDateTime.parse("2026-10-22T00:00:00"));
		save("Primero", TURISTA, EstadoViaje.PLANIFICADO, LocalDateTime.parse("2026-10-20T00:00:00"));

		Page<Viaje> result = viajeRepository.findByUsuarioAndEstadoNotOrderByFechaInicioAsc(
				TURISTA, EstadoViaje.CANCELADO, PageRequest.of(0, 10));

		assertThat(result.getContent()).extracting(Viaje::getNombre).containsExactly("Primero", "Segundo");
	}

	@Test
	@DisplayName("VZ-22: la página vacía de un turista sin viajes activos no falla")
	void returnsEmptyPageWhenNoActiveTrips() {
		save("Cancelado", TURISTA, EstadoViaje.CANCELADO);

		Page<Viaje> result = viajeRepository.findByUsuarioAndEstadoNotOrderByFechaInicioAsc(
				TURISTA, EstadoViaje.CANCELADO, PageRequest.of(0, 10));

		assertThat(result.getContent()).isEmpty();
	}

	@Test
	@DisplayName("VZ-23 CA2: un viaje cancelado no se encuentra por id")
	void excludesCancelledTripFromFindById() {
		Viaje cancelled = save("Cancelado", TURISTA, EstadoViaje.CANCELADO);
		Viaje active = save("Activo", TURISTA, EstadoViaje.PLANIFICADO);

		assertThat(viajeRepository.findByIdAndEstadoNot(cancelled.getId(), EstadoViaje.CANCELADO)).isEmpty();
		assertThat(viajeRepository.findByIdAndEstadoNot(active.getId(), EstadoViaje.CANCELADO)).isPresent();
	}

	private Viaje save(String nombre, String usuario, EstadoViaje estado) {
		return save(nombre, usuario, estado, LocalDateTime.parse("2026-10-20T00:00:00"));
	}

	private Viaje save(String nombre, String usuario, EstadoViaje estado, LocalDateTime inicio) {
		return viajeRepository.save(Viaje.builder()
				.nombre(nombre)
				.zonaInteres(Ubicacion.builder()
						.ciudad("Sierras de Córdoba")
						.localidad("Córdoba")
						.build())
				.rangoInteresKm(40)
				.fechaInicio(inicio)
				.fechaFin(inicio.plusDays(2))
				.ritmo(TipoRitmo.EQUILIBRADO)
				.estado(estado)
				.usuario(usuario)
				.build());
	}
}
