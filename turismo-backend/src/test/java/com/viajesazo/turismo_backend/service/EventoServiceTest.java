package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
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

import com.viajesazo.turismo_backend.dto.request.EventoRequest;
import com.viajesazo.turismo_backend.dto.response.EventoResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.EventoMapperImpl;
import com.viajesazo.turismo_backend.model.Categoria;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.repository.EventoRepository;
import com.viajesazo.turismo_backend.repository.PublicadorRepository;

@ExtendWith(MockitoExtension.class)
class EventoServiceTest {

	@Mock
	private EventoRepository eventoRepository;

	@Mock
	private PublicadorRepository publicadorRepository;

	private EventoService service;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(LocalDate.parse("2026-09-23").atStartOfDay(ZoneId.of("America/Argentina/Buenos_Aires")).toInstant(),
				ZoneId.of("America/Argentina/Buenos_Aires"));
		service = new EventoService(eventoRepository, publicadorRepository, clock, new EventoMapperImpl());
	}

	@Test
	@DisplayName("US1: registra el evento y lo devuelve con el id asignado")
	void createsEvent() {
		when(publicadorRepository.findById(1L)).thenReturn(Optional.of(publisher()));
		when(eventoRepository.save(any(Evento.class))).thenAnswer(invocation -> {
			Evento saved = invocation.getArgument(0);
			saved.setId(7L);
			return saved;
		});

		EventoResponse result = service.create(request());

		assertThat(result.id()).isEqualTo(7L);
		assertThat(result.nombre()).isEqualTo("Festival de Folklore");
		assertThat(result.categoria()).isEqualTo(Categoria.CULTURA);
		assertThat(result.publicadorId()).isEqualTo(1L);
		verify(eventoRepository).save(any(Evento.class));
	}

	@Test
	@DisplayName("US1: sin lista de imágenes, el evento se guarda con la lista vacía y no con null")
	void savesEmptyImagesWhenNoneGiven() {
		when(publicadorRepository.findById(1L)).thenReturn(Optional.of(publisher()));
		when(eventoRepository.save(any(Evento.class))).thenAnswer(invocation -> invocation.getArgument(0));

		EventoRequest request = new EventoRequest("Evento", null, null, null, null,
				LocalDate.parse("2026-10-01"), LocalDate.parse("2026-10-02"), null, null, null, 1L);

		EventoResponse result = service.create(request);

		assertThat(result.imagenes()).isEmpty();
	}

	@Test
	@DisplayName("US1: si el publicador no existe, devuelve 404 y no guarda nada")
	void failsWhenPublisherNotFound() {
		when(publicadorRepository.findById(99L)).thenReturn(Optional.empty());

		EventoRequest request = new EventoRequest("Festival de Folklore", null, null, null, null,
				LocalDate.parse("2026-10-01"), LocalDate.parse("2026-10-03"), null, null, null, 99L);

		assertThatThrownBy(() -> service.create(request))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessageContaining("99");
		verify(eventoRepository, never()).save(any(Evento.class));
	}

	@Test
	@DisplayName("la fecha de finalización no puede ser anterior a la de inicio")
	void rejectsInvalidDateRange() {
		EventoRequest request = new EventoRequest("Evento", null, null, null, null,
				LocalDate.parse("2026-10-10"), LocalDate.parse("2026-10-01"), null, null, null, 1L);

		assertThatThrownBy(() -> service.create(request))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("fecha de finalización");
		verify(eventoRepository, never()).save(any(Evento.class));
	}

	@Test
	@DisplayName("el horario de finalización debe ser posterior al de inicio")
	void rejectsInvalidTimeRange() {
		EventoRequest request = new EventoRequest("Evento", null, null, null, null,
				LocalDate.parse("2026-10-01"), LocalDate.parse("2026-10-02"),
				LocalTime.of(22, 0), LocalTime.of(20, 0), null, 1L);

		assertThatThrownBy(() -> service.create(request))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("horario");
	}

	@Test
	@DisplayName("un único día de evento es válido: inicio y fin iguales")
	void acceptsSingleDayEvent() {
		when(publicadorRepository.findById(1L)).thenReturn(Optional.of(publisher()));
		when(eventoRepository.save(any(Evento.class))).thenAnswer(invocation -> invocation.getArgument(0));

		EventoRequest request = new EventoRequest("Evento", null, null, null, null,
				LocalDate.parse("2026-10-01"), LocalDate.parse("2026-10-01"), null, null, null, 1L);

		assertThat(service.create(request).nombre()).isEqualTo("Evento");
	}

	@Test
	@DisplayName("US2: modifica los datos del evento existente")
	void updatesEvent() {
		when(eventoRepository.findById(7L)).thenReturn(Optional.of(persistedEvent()));
		when(publicadorRepository.findById(1L)).thenReturn(Optional.of(publisher()));
		when(eventoRepository.save(any(Evento.class))).thenAnswer(invocation -> invocation.getArgument(0));

		EventoResponse result = service.update(7L, request());

		assertThat(result.nombre()).isEqualTo("Festival de Folklore");
		assertThat(result.localidad()).isEqualTo("Cosquín");
	}

	@Test
	@DisplayName("US2: modificar un evento inexistente devuelve 404")
	void failsWhenUpdatingMissingEvent() {
		when(eventoRepository.findById(404L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.update(404L, request()))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessageContaining("404");
	}

	@Test
	@DisplayName("US3: la baja elimina el evento")
	void deletesEvent() {
		Evento evento = persistedEvent();
		when(eventoRepository.findById(7L)).thenReturn(Optional.of(evento));

		service.delete(7L);

		verify(eventoRepository).delete(evento);
	}

	@Test
	@DisplayName("US3: dar de baja un evento inexistente devuelve 404")
	void failsWhenDeletingMissingEvent() {
		when(eventoRepository.findById(404L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.delete(404L))
				.isInstanceOf(ResourceNotFoundException.class);
		verify(eventoRepository, never()).delete(any(Evento.class));
	}

	@Test
	@DisplayName("US4: consulta un evento por id")
	void findsEvent() {
		when(eventoRepository.findById(7L)).thenReturn(Optional.of(persistedEvent()));

		EventoResponse result = service.findById(7L);

		assertThat(result.id()).isEqualTo(7L);
		assertThat(result.nombre()).isEqualTo("Evento Original");
	}

	@Test
	@DisplayName("US4: consultar un evento inexistente devuelve 404")
	void failsWhenFindingMissingEvent() {
		when(eventoRepository.findById(404L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.findById(404L))
				.isInstanceOf(ResourceNotFoundException.class);
	}

	@Test
	@DisplayName("US5: devuelve los eventos del publicador ordenados por fecha de inicio")
	void findsEventsByPublisher() {
		when(publicadorRepository.existsById(1L)).thenReturn(true);
		when(eventoRepository.findByPublicadorIdOrderByFechaInicioAsc(eq(1L), any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(persistedEvent())));

		List<EventoResponse> result = service.findByPublicadorId(1L, Pageable.unpaged()).getContent();

		assertThat(result).hasSize(1);
		assertThat(result.get(0).id()).isEqualTo(7L);
	}

	@Test
	@DisplayName("US5: propaga la página pedida al repositorio")
	void propagatesPaginationToRepository() {
		when(publicadorRepository.existsById(1L)).thenReturn(true);
		when(eventoRepository.findByPublicadorIdOrderByFechaInicioAsc(eq(1L), any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(), PageRequest.of(1, 10), 25));

		Page<EventoResponse> page = service.findByPublicadorId(1L, PageRequest.of(1, 10));

		ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
		verify(eventoRepository).findByPublicadorIdOrderByFechaInicioAsc(eq(1L), pageable.capture());

		assertThat(pageable.getValue().getPageNumber()).isEqualTo(1);
		assertThat(pageable.getValue().getPageSize()).isEqualTo(10);
		assertThat(page.getTotalElements()).isEqualTo(25);
	}

	@Test
	@DisplayName("US5: si el publicador no existe devuelve 404 sin consultar los eventos")
	void failsWhenPublisherHasNoEvents() {
		when(publicadorRepository.existsById(99L)).thenReturn(false);

		assertThatThrownBy(() -> service.findByPublicadorId(99L, Pageable.unpaged()))
				.isInstanceOf(ResourceNotFoundException.class);
		verify(eventoRepository, never())
				.findByPublicadorIdOrderByFechaInicioAsc(any(), any(Pageable.class));
	}

	@Test
	@DisplayName("US7: lista todos los eventos sin filtrar por fecha ni por publicador")
	void listsAllEvents() {
		// A diferencia de la agenda, este listado no consulta al publicador ni mira el reloj: trae
		// todo lo cargado. El service no reordena, el repository ya devuelve el orden del contrato.
		when(eventoRepository.findAllByOrderByFechaInicioAscHorarioInicioAsc(any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(persistedEvent()), PageRequest.of(0, 20), 1));

		Page<EventoResponse> page = service.findAll(PageRequest.of(0, 20));

		assertThat(page.getContent()).extracting(EventoResponse::nombre).containsExactly("Evento Original");
		verify(publicadorRepository, never()).existsById(any());
	}

	@Test
	@DisplayName("US7: el listado completo propaga la página pedida al repositorio")
	void propagatesPaginationToAllEventsRepository() {
		when(eventoRepository.findAllByOrderByFechaInicioAscHorarioInicioAsc(any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(), PageRequest.of(2, 15), 70));

		Page<EventoResponse> page = service.findAll(PageRequest.of(2, 15));

		ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
		verify(eventoRepository).findAllByOrderByFechaInicioAscHorarioInicioAsc(pageable.capture());

		assertThat(pageable.getValue().getPageNumber()).isEqualTo(2);
		assertThat(pageable.getValue().getPageSize()).isEqualTo(15);
		assertThat(page.getTotalElements()).isEqualTo(70);
	}

	@Test
	@DisplayName("US7: sin eventos cargados devuelve una página vacía, no un 404")
	void listsAllEventsEmpty() {
		when(eventoRepository.findAllByOrderByFechaInicioAscHorarioInicioAsc(any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

		Page<EventoResponse> page = service.findAll(PageRequest.of(0, 20));

		assertThat(page.getContent()).isEmpty();
		assertThat(page.getTotalElements()).isZero();
	}

	private EventoRequest request() {
		return new EventoRequest("Festival de Folklore", "Encuentro de Syrigamis", Categoria.CULTURA,
				"Cosquín", "Plaza Pringles", LocalDate.parse("2026-10-01"), LocalDate.parse("2026-10-03"),
				LocalTime.of(20, 0), LocalTime.of(23, 30), List.of("https://cdn.cordoba.gob.ar/folklore.jpg"), 1L);
	}

	private Publicador publisher() {
		return Publicador.builder().id(1L).nombre("Turismo Córdoba").email("info@cordoba.gob.ar").build();
	}

	private Evento persistedEvent() {
		return Evento.builder()
				.id(7L)
				.nombre("Evento Original")
				.categoria(Categoria.CULTURA)
				.localidad("Alta Gracia")
				.fechaInicio(LocalDate.parse("2026-09-25"))
				.fechaFin(LocalDate.parse("2026-09-26"))
				.publicador(publisher())
				.build();
	}

}
