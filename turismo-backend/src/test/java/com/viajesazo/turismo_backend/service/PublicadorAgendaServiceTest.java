package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.repository.ActividadRepository;
import com.viajesazo.turismo_backend.repository.EventoRepository;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class PublicadorAgendaServiceTest {

	@Mock
	private UsuarioRepository usuarioRepository;

	@Mock
	private EventoRepository eventoRepository;

	@Mock
	private ActividadRepository actividadRepository;

	@Mock
	private InscriptosService inscriptosService;

	@InjectMocks
	private PublicadorAgendaService service;

	@Test
	@DisplayName("mismo día con otro evento lanza BusinessRuleException")
	void rejectsSameDayEventOverlap() {
		when(eventoRepository.existsOverlapping(eq(1L), any(), any(), eq(null))).thenReturn(true);
		when(actividadRepository.existsOverlapping(eq(1L), any(), any(), eq(null))).thenReturn(false);

		assertThatThrownBy(() -> service.assertSinSolapamiento(
				1L, LocalDate.parse("2026-09-23"), LocalDate.parse("2026-09-23"), null, null))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("solapa");
	}

	@Test
	@DisplayName("mismo día con una actividad (cross-tipo) también rechaza")
	void rejectsCrossTypeSameDay() {
		when(eventoRepository.existsOverlapping(eq(1L), any(), any(), eq(null))).thenReturn(false);
		when(actividadRepository.existsOverlapping(eq(1L), any(), any(), eq(null))).thenReturn(true);

		assertThatThrownBy(() -> service.assertSinSolapamiento(
				1L, LocalDate.parse("2026-09-23"), LocalDate.parse("2026-09-23"), null, null))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("solapa");
	}

	@Test
	@DisplayName("sin solape no lanza y consulta ambos repositorios")
	void allowsNonOverlappingRange() {
		when(eventoRepository.existsOverlapping(eq(1L), any(), any(), eq(7L))).thenReturn(false);
		when(actividadRepository.existsOverlapping(eq(1L), any(), any(), eq(null))).thenReturn(false);

		assertThatCode(() -> service.assertSinSolapamiento(
				1L, LocalDate.parse("2026-09-24"), LocalDate.parse("2026-09-24"), 7L, null))
				.doesNotThrowAnyException();

		verify(eventoRepository).existsOverlapping(
				1L, LocalDate.parse("2026-09-24"), LocalDate.parse("2026-09-24"), 7L);
		verify(actividadRepository).existsOverlapping(
				1L, LocalDate.parse("2026-09-24"), LocalDate.parse("2026-09-24"), null);
	}
}
