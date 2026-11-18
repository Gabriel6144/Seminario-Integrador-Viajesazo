package com.viajesazo.turismo_backend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.model.Viaje;

@DataJpaTest
class ViajeRepositoryTest {

	@Autowired
	private ViajeRepository viajeRepository;

	@Autowired
	private UsuarioRepository usuarioRepository;

	private Usuario turista;
	private Usuario otro;

	@BeforeEach
	void setUp() {
		String hash = new BCryptPasswordEncoder().encode("Turista123!");
		turista = usuarioRepository.save(Usuario.builder()
				.nombre("Turista")
				.email("turista@test.com")
				.contrasena(hash)
				.roles(new HashSet<>(Set.of(Rol.TURISTA)))
				.build());
		otro = usuarioRepository.save(Usuario.builder()
				.nombre("Otro")
				.email("otro@test.com")
				.contrasena(hash)
				.roles(new HashSet<>(Set.of(Rol.TURISTA)))
				.build());
	}

	@Test
	@DisplayName("VZ-22: lista los estados permitidos del turista y excluye los terminales")
	void listsAllowedTripsOfTourist() {
		save("Borrador propio", turista, EstadoViaje.BORRADOR);
		save("Planificado propio", turista, EstadoViaje.PLANIFICADO);
		save("En curso propio", turista, EstadoViaje.EN_CURSO);
		save("Cancelado propio", turista, EstadoViaje.CANCELADO);
		save("Finalizado propio", turista, EstadoViaje.FINALIZADO);
		save("Activo ajeno", otro, EstadoViaje.PLANIFICADO);

		Page<Viaje> result = viajeRepository.findByUsuarioAndEstadoInOrderByFechaInicioAsc(
				turista, List.of(EstadoViaje.BORRADOR, EstadoViaje.PLANIFICADO, EstadoViaje.EN_CURSO),
				PageRequest.of(0, 10));

		assertThat(result.getContent()).extracting(Viaje::getNombre)
				.containsExactly("Borrador propio", "Planificado propio", "En curso propio");
	}

	@Test
	@DisplayName("VZ-22: ordena los estados permitidos por fecha de inicio")
	void ordersAllowedTripsByStartDate() {
		save("Segundo", turista, EstadoViaje.PLANIFICADO, LocalDate.parse("2026-10-22"));
		save("Primero", turista, EstadoViaje.PLANIFICADO, LocalDate.parse("2026-10-20"));

		Page<Viaje> result = viajeRepository.findByUsuarioAndEstadoInOrderByFechaInicioAsc(
				turista, List.of(EstadoViaje.BORRADOR, EstadoViaje.PLANIFICADO, EstadoViaje.EN_CURSO),
				PageRequest.of(0, 10));

		assertThat(result.getContent()).extracting(Viaje::getNombre).containsExactly("Primero", "Segundo");
	}

	@Test
	@DisplayName("VZ-22: la página vacía de un turista sin estados permitidos no falla")
	void returnsEmptyPageWhenNoAllowedTrips() {
		save("Cancelado", turista, EstadoViaje.CANCELADO);
		save("Finalizado", turista, EstadoViaje.FINALIZADO);

		Page<Viaje> result = viajeRepository.findByUsuarioAndEstadoInOrderByFechaInicioAsc(
				turista, List.of(EstadoViaje.BORRADOR, EstadoViaje.PLANIFICADO, EstadoViaje.EN_CURSO),
				PageRequest.of(0, 10));

		assertThat(result.getContent()).isEmpty();
	}

	@Test
	@DisplayName("VZ-23 CA2: un viaje cancelado no se encuentra por id")
	void excludesCancelledTripFromFindById() {
		Viaje cancelled = save("Cancelado", turista, EstadoViaje.CANCELADO);
		Viaje active = save("Activo", turista, EstadoViaje.PLANIFICADO);

		assertThat(viajeRepository.findByIdAndEstadoNotIn(cancelled.getId(),
				List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO))).isEmpty();
		assertThat(viajeRepository.findByIdAndEstadoNotIn(active.getId(),
				List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO))).isPresent();
	}

	@Test
	@DisplayName("baja de usuario: trae solo los viajes del turista en los estados pedidos")
	void findsTripsOfTouristByStates() {
		save("Borrador propio", turista, EstadoViaje.BORRADOR);
		save("Planificado propio", turista, EstadoViaje.PLANIFICADO);
		save("En curso propio", turista, EstadoViaje.EN_CURSO);
		save("Finalizado propio", turista, EstadoViaje.FINALIZADO);
		save("Planificado ajeno", otro, EstadoViaje.PLANIFICADO);

		List<Viaje> result = viajeRepository.findByUsuarioAndEstadoIn(turista,
				List.of(EstadoViaje.BORRADOR, EstadoViaje.PLANIFICADO));

		assertThat(result).extracting(Viaje::getNombre)
				.containsExactlyInAnyOrder("Borrador propio", "Planificado propio");
	}

	private Viaje save(String nombre, Usuario usuario, EstadoViaje estado) {
		return save(nombre, usuario, estado, LocalDate.parse("2026-10-20"));
	}

	private Viaje save(String nombre, Usuario usuario, EstadoViaje estado, LocalDate inicio) {
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
