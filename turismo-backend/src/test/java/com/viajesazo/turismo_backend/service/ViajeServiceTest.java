package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.viajesazo.turismo_backend.dto.request.UbicacionRequest;
import com.viajesazo.turismo_backend.dto.request.ViajeRequest;
import com.viajesazo.turismo_backend.dto.response.ViajeResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.ViajeMapperImpl;
import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.repository.ViajeRepository;

@ExtendWith(MockitoExtension.class)
class ViajeServiceTest {

	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-15T12:00:00Z"), ZoneOffset.UTC);

	@Mock
	private ViajeRepository viajeRepository;

	private ViajeService service;

	@BeforeEach
	void setUp() {
		service = new ViajeService(viajeRepository, new ViajeMapperImpl(), CLOCK);
	}

	@Test
	@DisplayName("VZ-19: registra el viaje, lo asocia al turista y nace PLANIFICADO")
	void createsTrip() {
		when(viajeRepository.save(any(Viaje.class))).thenAnswer(invocation -> {
			Viaje saved = invocation.getArgument(0);
			saved.setId(7L);
			return saved;
		});

		ViajeResponse result = service.create(request());

		assertThat(result.id()).isEqualTo(7L);
		assertThat(result.nombre()).isEqualTo("Escapada serrana");
		assertThat(result.estado()).isEqualTo(EstadoViaje.PLANIFICADO);
		assertThat(result.usuario()).isEqualTo("turista@test.com");
		assertThat(result.ubicacion().ciudad()).isEqualTo("Villa General Belgrano");
		assertThat(result.fechaInicio()).isEqualTo(LocalDate.parse("2026-10-20"));
		verify(viajeRepository).save(any(Viaje.class));
	}

	@Test
	@DisplayName("VZ-19 CA3: rechaza un viaje con fecha de finalización anterior al inicio")
	void rejectsInvalidDateRange() {
		ViajeRequest invalid = new ViajeRequest("Escapada", ubicacion(), 35,
				LocalDate.parse("2026-10-22"), LocalDate.parse("2026-10-20"),
				TipoRitmo.EQUILIBRADO, List.of(), "turista@test.com");

		assertThatThrownBy(() -> service.create(invalid))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("fecha de finalización");
		verify(viajeRepository, never()).save(any(Viaje.class));
	}

	@Test
	@DisplayName("VZ-21 CA2: modifica los datos del viaje existente")
	void updatesTrip() {
		when(viajeRepository.findByIdAndEstadoNotIn(7L, List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO)))
				.thenReturn(Optional.of(persistedTrip()));
		when(viajeRepository.save(any(Viaje.class))).thenAnswer(invocation -> invocation.getArgument(0));

		ViajeRequest changed = new ViajeRequest("Nueva escapada", ubicacion(), 40,
				LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-03"),
				TipoRitmo.INTENSIVO, List.of(InteresCategoria.NATURALEZA), "turista@test.com");
		ViajeResponse result = service.update(7L, changed);

		assertThat(result.id()).isEqualTo(7L);
		assertThat(result.nombre()).isEqualTo("Nueva escapada");
		assertThat(result.ritmo()).isEqualTo(TipoRitmo.INTENSIVO);
		assertThat(result.rangoInteresKm()).isEqualTo(40);
		assertThat(result.interesesCategoria()).containsExactly(InteresCategoria.NATURALEZA);
	}

	@Test
	@DisplayName("VZ-21: modificar un viaje inexistente devuelve 404")
	void failsWhenUpdatingMissingTrip() {
		when(viajeRepository.findByIdAndEstadoNotIn(404L, List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO))).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.update(404L, request()))
				.isInstanceOf(ResourceNotFoundException.class);
	}

	@Test
	@DisplayName("VZ-22: consultar un viaje inexistente o dado de baja devuelve 404")
	void failsWhenFindingMissingTrip() {
		when(viajeRepository.findByIdAndEstadoNotIn(404L, List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO))).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.findById(404L))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessageContaining("404");
	}

	@Test
	@DisplayName("VZ-23: la baja es lógica, marca CANCELADO y no borra la fila")
	void deletesLogically() {
		Viaje persisted = persistedTrip();
		when(viajeRepository.findByIdAndEstadoNotIn(7L, List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO))).thenReturn(Optional.of(persisted));
		when(viajeRepository.save(any(Viaje.class))).thenAnswer(invocation -> invocation.getArgument(0));

		service.delete(7L);

		assertThat(persisted.getEstado()).isEqualTo(EstadoViaje.CANCELADO);
		verify(viajeRepository).save(persisted);
	}

	@Test
	@DisplayName("VZ-23: un viaje en curso no se puede cancelar")
	void cannotCancelOngoingTrip() {
		Viaje persisted = persistedTrip();
		persisted.setEstado(EstadoViaje.EN_CURSO);
		when(viajeRepository.findByIdAndEstadoNotIn(7L, List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO)))
				.thenReturn(Optional.of(persisted));

		assertThatThrownBy(() -> service.delete(7L))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("EN_CURSO");
		assertThat(persisted.getEstado()).isEqualTo(EstadoViaje.EN_CURSO);
		verify(viajeRepository, never()).save(any(Viaje.class));
	}

	@Test
	@DisplayName("VZ-21: un viaje en curso no se puede modificar")
	void cannotUpdateOngoingTrip() {
		Viaje persisted = persistedTrip();
		persisted.setEstado(EstadoViaje.EN_CURSO);
		when(viajeRepository.findByIdAndEstadoNotIn(7L, List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO)))
				.thenReturn(Optional.of(persisted));

		assertThatThrownBy(() -> service.update(7L, request()))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("en curso");
	}

	@Test
	@DisplayName("completar un borrador lo deja PLANIFICADO y en el paso 8")
	void completesDraft() {
		Viaje draft = persistedTrip();
		draft.setEstado(EstadoViaje.BORRADOR);
		when(viajeRepository.findByIdAndEstado(7L, EstadoViaje.BORRADOR)).thenReturn(Optional.of(draft));
		when(viajeRepository.save(any(Viaje.class))).thenAnswer(invocation -> invocation.getArgument(0));

		ViajeResponse result = service.completeDraft(7L);

		assertThat(result.estado()).isEqualTo(EstadoViaje.PLANIFICADO);
		assertThat(result.pasoActual()).isEqualTo(8);
	}

	@Test
	@DisplayName("el scheduler pasa los viajes por fecha a EN_CURSO o FINALIZADO")
	void appliesAutomaticTransitions() {
		Viaje enCurso = persistedTrip();
		enCurso.setEstado(EstadoViaje.PLANIFICADO);
		enCurso.setFechaInicio(LocalDate.parse("2026-10-14"));
		enCurso.setFechaFin(LocalDate.parse("2026-10-16"));

		Viaje vencido = persistedTrip();
		vencido.setEstado(EstadoViaje.PLANIFICADO);
		vencido.setFechaInicio(LocalDate.parse("2026-10-10"));
		vencido.setFechaFin(LocalDate.parse("2026-10-12"));

		when(viajeRepository.findByEstadoIn(any())).thenReturn(List.of(enCurso, vencido));

		service.aplicarTransicionesAutomaticas();

		assertThat(enCurso.getEstado()).isEqualTo(EstadoViaje.EN_CURSO);
		assertThat(vencido.getEstado()).isEqualTo(EstadoViaje.FINALIZADO);
	}

	@Test
	@DisplayName("VZ-22: lista BORRADOR, PLANIFICADO y EN_CURSO, excluyendo estados terminales")
	void listsAllowedTripsOfTourist() {
		Viaje draft = persistedTrip();
		draft.setNombre("Borrador");
		draft.setEstado(EstadoViaje.BORRADOR);
		Viaje planned = persistedTrip();
		planned.setNombre("Planificado");
		Viaje ongoing = persistedTrip();
		ongoing.setNombre("En curso");
		ongoing.setEstado(EstadoViaje.EN_CURSO);
		when(viajeRepository.findByUsuarioAndEstadoInOrderByFechaInicioAsc(
				eq("turista@test.com"),
				eq(List.of(EstadoViaje.BORRADOR, EstadoViaje.PLANIFICADO, EstadoViaje.EN_CURSO)),
				any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(draft, planned, ongoing), PageRequest.of(0, 10), 3));

		Page<ViajeResponse> result = service.findAll("turista@test.com", PageRequest.of(0, 10));

		assertThat(result.getContent()).extracting(ViajeResponse::nombre)
				.containsExactly("Borrador", "Planificado", "En curso");
		assertThat(result.getContent()).extracting(ViajeResponse::estado)
				.containsExactly(EstadoViaje.BORRADOR, EstadoViaje.PLANIFICADO, EstadoViaje.EN_CURSO);
		assertThat(result.getTotalElements()).isEqualTo(3);
	}

	private ViajeRequest request() {
		return new ViajeRequest("Escapada serrana", ubicacion(), 35,
				LocalDate.parse("2026-10-20"), LocalDate.parse("2026-10-22"),
				TipoRitmo.EQUILIBRADO, List.of(InteresCategoria.CULTURA), "turista@test.com");
	}

	private UbicacionRequest ubicacion() {
		return new UbicacionRequest(new java.math.BigDecimal("-31.95"),
				new java.math.BigDecimal("-64.55"), "Villa General Belgrano", "Córdoba");
	}

	private Viaje persistedTrip() {
		return Viaje.builder()
				.id(7L)
				.nombre("Escapada serrana")
				.zonaInteres(Ubicacion.builder()
						.id(1L)
						.ciudad("Villa General Belgrano")
						.localidad("Córdoba")
						.latitud(new java.math.BigDecimal("-31.95"))
						.longitud(new java.math.BigDecimal("-64.55"))
						.build())
				.rangoInteresKm(35.0)
				.fechaInicio(java.time.LocalDate.parse("2026-10-20"))
				.fechaFin(java.time.LocalDate.parse("2026-10-22"))
				.ritmo(TipoRitmo.EQUILIBRADO)
				.interesesCategoria(new java.util.ArrayList<>(List.of(InteresCategoria.CULTURA)))
				.estado(EstadoViaje.PLANIFICADO)
				.usuario("turista@test.com")
				.build();
	}
}
