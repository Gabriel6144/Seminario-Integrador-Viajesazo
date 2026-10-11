package com.viajesazo.turismo_backend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import com.viajesazo.turismo_backend.model.TipoRitmo;
import com.viajesazo.turismo_backend.model.Viaje;

@DataJpaTest
class ViajeRepositoryTest {

	private static final LocalDateTime FROM = LocalDateTime.parse("2026-10-20T00:00:00");
	private static final LocalDateTime TO = LocalDateTime.parse("2026-10-25T23:59:59");

	@Autowired
	private ViajeRepository viajeRepository;

	@Test
	@DisplayName("incluye los viajes que se solapan con el rango consultado")
	void includesOverlappingTrips() {
		save("Viaje vigente", LocalDateTime.parse("2026-10-19T10:00:00"),
				LocalDateTime.parse("2026-10-21T18:00:00"));
		save("Viaje futuro dentro del rango", LocalDateTime.parse("2026-10-24T10:00:00"),
				LocalDateTime.parse("2026-10-27T18:00:00"));

		assertThat(viajeRepository.findOverlapping(FROM, TO, PageRequest.of(0, 10)).getContent())
				.extracting(Viaje::getNombre)
				.containsExactly("Viaje vigente", "Viaje futuro dentro del rango");
	}

	@Test
	@DisplayName("excluye los viajes completamente fuera del rango")
	void excludesTripsOutsideRange() {
		save("Viaje pasado", LocalDateTime.parse("2026-10-10T10:00:00"),
				LocalDateTime.parse("2026-10-19T18:00:00"));
		save("Viaje posterior", LocalDateTime.parse("2026-10-26T10:00:00"),
				LocalDateTime.parse("2026-10-27T18:00:00"));

		assertThat(viajeRepository.findOverlapping(FROM, TO, PageRequest.of(0, 10)).getContent()).isEmpty();
	}

	@Test
	@DisplayName("lista los viajes ordenados por inicio y fin")
	void ordersTripsByStartAndEnd() {
		save("Segundo", LocalDateTime.parse("2026-10-22T10:00:00"),
				LocalDateTime.parse("2026-10-24T18:00:00"));
		save("Primero", LocalDateTime.parse("2026-10-20T10:00:00"),
				LocalDateTime.parse("2026-10-21T18:00:00"));

		Page<Viaje> result = viajeRepository.findAllByOrderByFechaInicioAscFechaFinAsc(PageRequest.of(0, 10));

		assertThat(result.getContent()).extracting(Viaje::getNombre).containsExactly("Primero", "Segundo");
	}

	private Viaje save(String nombre, LocalDateTime inicio, LocalDateTime fin) {
		return viajeRepository.save(Viaje.builder()
				.nombre(nombre)
				.zonaInteres("Sierras de Córdoba")
				.rangoInteresKm(40)
				.fechaInicio(inicio)
				.fechaFin(fin)
				.ritmo(TipoRitmo.EQUILIBRADO)
				.usuario("turista@test.com")
				.build());
	}
}
