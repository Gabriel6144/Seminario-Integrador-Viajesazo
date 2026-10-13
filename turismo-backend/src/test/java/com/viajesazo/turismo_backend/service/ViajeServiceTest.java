package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
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

	@Mock
	private ViajeRepository viajeRepository;

	private ViajeService service;

	@BeforeEach
	void setUp() {
		service = new ViajeService(viajeRepository, new ViajeMapperImpl());
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
		when(viajeRepository.findByIdAndEstadoNot(7L, EstadoViaje.CANCELADO))
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
		when(viajeRepository.findByIdAndEstadoNot(404L, EstadoViaje.CANCELADO)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.update(404L, request()))
				.isInstanceOf(ResourceNotFoundException.class);
	}

	@Test
	@DisplayName("VZ-22: consultar un viaje inexistente o dado de baja devuelve 404")
	void failsWhenFindingMissingTrip() {
		when(viajeRepository.findByIdAndEstadoNot(404L, EstadoViaje.CANCELADO)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.findById(404L))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessageContaining("404");
	}

	@Test
	@DisplayName("VZ-23: la baja es lógica, marca CANCELADO y no borra la fila")
	void deletesLogically() {
		Viaje persisted = persistedTrip();
		when(viajeRepository.findByIdAndEstadoNot(7L, EstadoViaje.CANCELADO)).thenReturn(Optional.of(persisted));
		when(viajeRepository.save(any(Viaje.class))).thenAnswer(invocation -> invocation.getArgument(0));

		service.delete(7L);

		assertThat(persisted.getEstado()).isEqualTo(EstadoViaje.CANCELADO);
		verify(viajeRepository).save(persisted);
	}

	@Test
	@DisplayName("VZ-22: lista los viajes activos del turista, paginados")
	void listsActiveTripsOfTourist() {
		when(viajeRepository.findByUsuarioAndEstadoNotOrderByFechaInicioAsc(
				eq("turista@test.com"), eq(EstadoViaje.CANCELADO), any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(persistedTrip()), PageRequest.of(0, 10), 1));

		Page<ViajeResponse> result = service.findAll("turista@test.com", PageRequest.of(0, 10));

		assertThat(result.getContent()).extracting(ViajeResponse::nombre).containsExactly("Escapada serrana");
		assertThat(result.getTotalElements()).isEqualTo(1);
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
				.rangoInteresKm(35)
				.fechaInicio(java.time.LocalDateTime.parse("2026-10-20T00:00:00"))
				.fechaFin(java.time.LocalDateTime.parse("2026-10-22T00:00:00"))
				.ritmo(TipoRitmo.EQUILIBRADO)
				.estado(EstadoViaje.PLANIFICADO)
				.usuario("turista@test.com")
				.build();
	}
}
