package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
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

import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.repository.ViajeRepository;

@ExtendWith(MockitoExtension.class)
class ViajeServiceTest {

	@Mock
	private ViajeRepository viajeRepository;

	private ViajeService service;

	@BeforeEach
	void setUp() {
		service = new ViajeService(viajeRepository);
	}

	@Test
	@DisplayName("registra el viaje y lo devuelve con el id asignado")
	void createsTrip() {
		when(viajeRepository.save(any(Viaje.class))).thenAnswer(invocation -> {
			Viaje saved = invocation.getArgument(0);
			saved.setId(7L);
			return saved;
		});

		Viaje result = service.create(trip());

		assertThat(result.getId()).isEqualTo(7L);
		assertThat(result.getNombre()).isEqualTo("Escapada serrana");
		verify(viajeRepository).save(any(Viaje.class));
	}

	@Test
	@DisplayName("rechaza un viaje con fecha de finalización anterior al inicio")
	void rejectsInvalidDateRange() {
		Viaje invalid = trip();
		invalid.setFechaFin(invalid.getFechaInicio().minusHours(1));

		assertThatThrownBy(() -> service.create(invalid))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("fecha de finalización");
		verify(viajeRepository, never()).save(any(Viaje.class));
	}

	@Test
	@DisplayName("modifica los datos del viaje existente")
	void updatesTrip() {
		when(viajeRepository.findById(7L)).thenReturn(Optional.of(persistedTrip()));
		when(viajeRepository.save(any(Viaje.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Viaje updated = trip();
		updated.setNombre("Nueva escapada");
		Viaje result = service.update(7L, updated);

		assertThat(result.getId()).isEqualTo(7L);
		assertThat(result.getNombre()).isEqualTo("Nueva escapada");
	}

	@Test
	@DisplayName("consultar un viaje inexistente devuelve 404")
	void failsWhenFindingMissingTrip() {
		when(viajeRepository.findById(404L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.findById(404L))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessageContaining("404");
	}

	@Test
	@DisplayName("lista los viajes delegando el orden y la página en el repositorio")
	void listsTrips() {
		when(viajeRepository.findAllByOrderByFechaInicioAscFechaFinAsc(any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(persistedTrip()), PageRequest.of(0, 10), 1));

		Page<Viaje> result = service.findAll(PageRequest.of(0, 10));

		assertThat(result.getContent()).extracting(Viaje::getNombre).containsExactly("Escapada serrana");
		assertThat(result.getTotalElements()).isEqualTo(1);
	}

	@Test
	@DisplayName("consulta los viajes que se solapan con un rango")
	void findsOverlappingTrips() {
		when(viajeRepository.findOverlapping(any(), any(), any()))
				.thenReturn(new PageImpl<>(List.of(persistedTrip())));

		Page<Viaje> result = service.findOverlapping(
				LocalDateTime.parse("2026-10-20T00:00:00"),
				LocalDateTime.parse("2026-10-25T23:59:59"),
				Pageable.unpaged());

		assertThat(result.getContent()).extracting(Viaje::getNombre).containsExactly("Escapada serrana");
	}

	private Viaje trip() {
		return Viaje.builder()
				.nombre("Escapada serrana")
				.zonaInteres("Villa General Belgrano")
				.rangoInteresKm(35)
				.fechaInicio(LocalDateTime.parse("2026-10-20T09:00:00"))
				.fechaFin(LocalDateTime.parse("2026-10-22T18:00:00"))
				.ritmo(TipoRitmo.EQUILIBRADO)
				.usuario("turista@test.com")
				.build();
	}

	private Viaje persistedTrip() {
		Viaje trip = trip();
		trip.setId(7L);
		return trip;
	}
}
