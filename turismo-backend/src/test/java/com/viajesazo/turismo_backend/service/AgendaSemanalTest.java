package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.viajesazo.turismo_backend.dto.response.EventoResponse;
import com.viajesazo.turismo_backend.mapper.EventoMapperImpl;
import com.viajesazo.turismo_backend.model.Categoria;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.repository.EventoRepository;
import com.viajesazo.turismo_backend.repository.PublicadorRepository;

@ExtendWith(MockitoExtension.class)
class AgendaSemanalTest {

	private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

	@Mock
	private EventoRepository eventoRepository;

	@Mock
	private PublicadorRepository publicadorRepository;

	@Test
	@DisplayName("un miércoles consulta desde hoy hasta el domingo de esa semana")
	void weekFromWednesday() {
		assertRange("2026-09-23", "2026-09-27");
	}

	@Test
	@DisplayName("un lunes consulta desde ese mismo lunes hasta el domingo")
	void weekFromMonday() {
		assertRange("2026-09-21", "2026-09-27");
	}

	@Test
	@DisplayName("un domingo consulta solo ese domingo, no la semana siguiente")
	void weekFromSunday() {
		assertRange("2026-09-27", "2026-09-27");
	}

	@Test
	@DisplayName("la semana no se desborda al cambiar de mes ni de año")
	void weekAcrossYearBoundary() {
		assertRange("2025-12-31", "2026-01-04");
	}

	@Test
	@DisplayName("el límite inferior es hoy y no el lunes: no se arrastran los ya terminados")
	void lowerBoundIsTodayNotMonday() {
		// Un miércoles: el lunes y el martes ya pasaron. Si se pasara el lunes como límite,
		// un evento del lunes al martes entraría igual y la agenda mostraría algo que ya pasó.
		when(eventoRepository.findOverlapping(any(), any(), any())).thenReturn(emptyPage());

		serviceAt("2026-09-23").findWeeklyAgenda(Pageable.unpaged());

		ArgumentCaptor<LocalDate> from = ArgumentCaptor.forClass(LocalDate.class);
		ArgumentCaptor<LocalDate> to = ArgumentCaptor.forClass(LocalDate.class);
		verify(eventoRepository).findOverlapping(from.capture(), to.capture(), any());

		assertThat(from.getValue()).isEqualTo(LocalDate.parse("2026-09-23"));
		assertThat(from.getValue()).isNotEqualTo(LocalDate.parse("2026-09-21"));
		assertThat(to.getValue()).isEqualTo(LocalDate.parse("2026-09-27"));
	}

	@Test
	@DisplayName("los eventos encontrados se devuelven mapeados con el nombre del publicador")
	void mapsWeekEvents() {
		when(eventoRepository.findOverlapping(any(), any(), any())).thenReturn(pageOf(testEvent()));

		List<EventoResponse> agenda = content(serviceAt("2026-09-23").findWeeklyAgenda(Pageable.unpaged()));

		assertThat(agenda).hasSize(1);
		assertThat(agenda.get(0).nombre()).isEqualTo("Festival de Folklore");
		assertThat(agenda.get(0).publicadorNombre()).isEqualTo("Turismo Córdoba");
		assertThat(agenda.get(0).imagenes()).containsExactly("https://cdn.turismo.cordoba.gob.ar/folklore.jpg");
	}

	@Test
	@DisplayName("la agenda devuelve la página pedida con el total de la semana")
	void paginatesAgenda() {
		when(eventoRepository.findOverlapping(any(), any(), any()))
				.thenReturn(new PageImpl<>(List.of(testEvent()), PageRequest.of(0, 1), 2));

		Page<EventoResponse> page = serviceAt("2026-09-23").findWeeklyAgenda(PageRequest.of(0, 1));

		assertThat(page.getContent()).extracting(EventoResponse::nombre)
				.containsExactly("Festival de Folklore");
		assertThat(page.getTotalElements()).isEqualTo(2);
		assertThat(page.getTotalPages()).isEqualTo(2);
	}

	/**
	 * El service debe pasar hoy como límite inferior y el domingo de la semana ISO como superior.
	 * Que {@code to} sea correcto es lo que demuestra que el lunes se calculó bien, porque
	 * domingo = lunes + 6.
	 */
	private void assertRange(String today, String expectedSunday) {
		when(eventoRepository.findOverlapping(any(), any(), any())).thenReturn(emptyPage());

		serviceAt(today).findWeeklyAgenda(Pageable.unpaged());

		ArgumentCaptor<LocalDate> from = ArgumentCaptor.forClass(LocalDate.class);
		ArgumentCaptor<LocalDate> to = ArgumentCaptor.forClass(LocalDate.class);
		verify(eventoRepository).findOverlapping(from.capture(), to.capture(), any());

		assertThat(from.getValue()).isEqualTo(LocalDate.parse(today));
		assertThat(to.getValue()).isEqualTo(LocalDate.parse(expectedSunday));
	}

	private List<EventoResponse> content(Page<EventoResponse> page) {
		return page.getContent();
	}

	private Page<Evento> pageOf(Evento... events) {
		return new PageImpl<>(List.of(events));
	}

	private Page<Evento> emptyPage() {
		return Page.empty();
	}

	private EventoService serviceAt(String today) {
		Clock fixed = Clock.fixed(LocalDate.parse(today).atStartOfDay(ZONE).toInstant(), ZONE);
		return new EventoService(eventoRepository, publicadorRepository, fixed, new EventoMapperImpl());
	}

	private Evento testEvent() {
		Publicador publicador = Publicador.builder().id(1L).nombre("Turismo Córdoba").build();
		return Evento.builder()
				.id(10L)
				.nombre("Festival de Folklore")
				.categoria(Categoria.CULTURA)
				.localidad("Cosquín")
				.fechaInicio(LocalDate.parse("2026-09-25"))
				.fechaFin(LocalDate.parse("2026-09-27"))
				.horarioInicio(LocalTime.of(20, 0))
				.horarioFin(LocalTime.of(23, 30))
				.imagenes(List.of("https://cdn.turismo.cordoba.gob.ar/folklore.jpg"))
				.publicador(publicador)
				.build();
	}

}
