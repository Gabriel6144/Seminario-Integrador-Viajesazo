package com.viajesazo.turismo_backend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;

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
	@DisplayName("VZ-22: lista los estados permitidos del turista y excluye los terminales")
	void listsAllowedTripsOfTourist() {
		save("Borrador propio", TURISTA, EstadoViaje.BORRADOR);
		save("Planificado propio", TURISTA, EstadoViaje.PLANIFICADO);
		save("En curso propio", TURISTA, EstadoViaje.EN_CURSO);
		save("Cancelado propio", TURISTA, EstadoViaje.CANCELADO);
		save("Finalizado propio", TURISTA, EstadoViaje.FINALIZADO);
		save("Activo ajeno", OTRO, EstadoViaje.PLANIFICADO);

		Page<Viaje> result = viajeRepository.findByUsuarioAndEstadoInOrderByFechaInicioAsc(
				TURISTA, List.of(EstadoViaje.BORRADOR, EstadoViaje.PLANIFICADO, EstadoViaje.EN_CURSO),
				PageRequest.of(0, 10));

		assertThat(result.getContent()).extracting(Viaje::getNombre)
				.containsExactly("Borrador propio", "Planificado propio", "En curso propio");
	}

	@Test
	@DisplayName("VZ-22: ordena los estados permitidos por fecha de inicio")
	void ordersAllowedTripsByStartDate() {
		save("Segundo", TURISTA, EstadoViaje.PLANIFICADO, LocalDate.parse("2026-10-22"));
		save("Primero", TURISTA, EstadoViaje.PLANIFICADO, LocalDate.parse("2026-10-20"));

		Page<Viaje> result = viajeRepository.findByUsuarioAndEstadoInOrderByFechaInicioAsc(
				TURISTA, List.of(EstadoViaje.BORRADOR, EstadoViaje.PLANIFICADO, EstadoViaje.EN_CURSO),
				PageRequest.of(0, 10));

		assertThat(result.getContent()).extracting(Viaje::getNombre).containsExactly("Primero", "Segundo");
	}

	@Test
	@DisplayName("VZ-22: la página vacía de un turista sin estados permitidos no falla")
	void returnsEmptyPageWhenNoAllowedTrips() {
		save("Cancelado", TURISTA, EstadoViaje.CANCELADO);
		save("Finalizado", TURISTA, EstadoViaje.FINALIZADO);

		Page<Viaje> result = viajeRepository.findByUsuarioAndEstadoInOrderByFechaInicioAsc(
				TURISTA, List.of(EstadoViaje.BORRADOR, EstadoViaje.PLANIFICADO, EstadoViaje.EN_CURSO),
				PageRequest.of(0, 10));

		assertThat(result.getContent()).isEmpty();
	}

	@Test
	@DisplayName("VZ-23 CA2: un viaje cancelado no se encuentra por id")
	void excludesCancelledTripFromFindById() {
		Viaje cancelled = save("Cancelado", TURISTA, EstadoViaje.CANCELADO);
		Viaje active = save("Activo", TURISTA, EstadoViaje.PLANIFICADO);

		assertThat(viajeRepository.findByIdAndEstadoNotIn(cancelled.getId(),
				List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO))).isEmpty();
		assertThat(viajeRepository.findByIdAndEstadoNotIn(active.getId(),
				List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO))).isPresent();
	}

	private Viaje save(String nombre, String usuario, EstadoViaje estado) {
		return save(nombre, usuario, estado, LocalDate.parse("2026-10-20"));
	}

	private Viaje save(String nombre, String usuario, EstadoViaje estado, LocalDate inicio) {
		return viajeRepository.save(Viaje.builder()
				.nombre(nombre)
				.zonaInteres(Ubicacion.builder()
						.ciudad("Sierras de Córdoba")
						.localidad("Córdoba")
						.build())
				.rangoInteresKm(40.0)
				.fechaInicio(inicio)
				.fechaFin(inicio.plusDays(2))
				.ritmo(TipoRitmo.EQUILIBRADO)
				.estado(estado)
				.usuario(usuario)
				.build());
	}
}
