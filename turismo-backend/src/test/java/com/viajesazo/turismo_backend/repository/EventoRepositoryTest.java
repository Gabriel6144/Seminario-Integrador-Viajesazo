package com.viajesazo.turismo_backend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.viajesazo.turismo_backend.model.Categoria;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.Publicador;

@DataJpaTest
class EventoRepositoryTest {

	private static final LocalDate MONDAY = LocalDate.parse("2026-09-21");
	private static final LocalDate SUNDAY = LocalDate.parse("2026-09-27");

	@Autowired
	private EventoRepository eventoRepository;

	@Autowired
	private PublicadorRepository publicadorRepository;

	private Publicador publisher;

	@BeforeEach
	void setUp() {
		publisher = publicadorRepository.save(Publicador.builder()
				.nombre("Turismo Córdoba")
				.email("info@cordoba.gob.ar")
				.build());
	}

	@Test
	@DisplayName("incluye el evento que termina dentro de la semana")
	void includesEventWithinWeek() {
		save("Festival", LocalDate.parse("2026-09-25"), LocalDate.parse("2026-09-26"));

		assertThat(week(MONDAY, SUNDAY))
				.extracting(Evento::getNombre)
				.containsExactly("Festival");
	}

	@Test
	@DisplayName("incluye el evento que empezó antes de la semana y sigue vigente: cuenta como solapamiento")
	void includesEventStartedBeforeWeek() {
		save("Festival de 10 días", LocalDate.parse("2026-09-10"), LocalDate.parse("2026-09-24"));

		assertThat(week(MONDAY, SUNDAY))
				.extracting(Evento::getNombre)
				.containsExactly("Festival de 10 días");
	}

	@Test
	@DisplayName("incluye el evento que empieza en la semana y termina después")
	void includesEventEndingAfterWeek() {
		save("Exposición", LocalDate.parse("2026-09-25"), LocalDate.parse("2026-10-20"));

		assertThat(week(MONDAY, SUNDAY))
				.extracting(Evento::getNombre)
				.containsExactly("Exposición");
	}

	@Test
	@DisplayName("excluye el evento que ya terminó antes del lunes")
	void excludesEventEndedBefore() {
		save("Evento pasado", LocalDate.parse("2026-09-01"), LocalDate.parse("2026-09-19"));

		assertThat(week(MONDAY, SUNDAY)).isEmpty();
	}

	@Test
	@DisplayName("excluye el evento que empieza después del domingo")
	void excludesEventStartedAfter() {
		save("Evento futuro", LocalDate.parse("2026-09-28"), LocalDate.parse("2026-09-30"));

		assertThat(week(MONDAY, SUNDAY)).isEmpty();
	}

	@Test
	@DisplayName("con el límite en hoy, excluye el evento que terminó antes en la misma semana")
	void excludesEventEndedBeforeToday() {
		// Con el lunes como límite este evento entraba; con hoy (miércoles) tiene que quedar afuera.
		save("Ya terminado", LocalDate.parse("2026-09-21"), LocalDate.parse("2026-09-22"));
		save("En curso", LocalDate.parse("2026-09-24"), LocalDate.parse("2026-09-26"));

		LocalDate today = LocalDate.parse("2026-09-23");

		assertThat(week(today, SUNDAY))
				.extracting(Evento::getNombre)
				.containsExactly("En curso");
	}

	@Test
	@DisplayName("con el límite en hoy, un evento empezado antes de la semana y vigente sigue entrando")
	void keepsOverlapWithTodayAsLowerBound() {
		save("Festival de 10 días", LocalDate.parse("2026-09-10"), LocalDate.parse("2026-09-24"));

		assertThat(week(LocalDate.parse("2026-09-23"), SUNDAY))
				.extracting(Evento::getNombre)
				.containsExactly("Festival de 10 días");
	}

	@Test
	@DisplayName("los bordes quedan dentro: termina el domingo y arranca el lunes")
	void includesWeekBoundaries() {
		save("Termina el domingo", LocalDate.parse("2026-09-20"), SUNDAY);
		save("Arranca el lunes", MONDAY, LocalDate.parse("2026-09-22"));

		assertThat(week(MONDAY, SUNDAY))
				.extracting(Evento::getNombre)
				.containsExactlyInAnyOrder("Termina el domingo", "Arranca el lunes");
	}

	@Test
	@DisplayName("un día antes del lunes y un día después del domingo quedan fuera")
	void excludesImmediateSurroundingDays() {
		save("Termina el sábado", LocalDate.parse("2026-09-18"), LocalDate.parse("2026-09-20"));
		save("Arranca el lunes siguiente", LocalDate.parse("2026-09-28"), LocalDate.parse("2026-09-30"));

		assertThat(week(MONDAY, SUNDAY)).isEmpty();
	}

	@Test
	@DisplayName("la agenda ordena por fecha de inicio")
	void ordersByStartDate() {
		save("Tercero", LocalDate.parse("2026-09-26"), LocalDate.parse("2026-09-26"));
		save("Primero", LocalDate.parse("2026-09-21"), LocalDate.parse("2026-09-22"));
		save("Segundo", LocalDate.parse("2026-09-23"), LocalDate.parse("2026-09-24"));

		assertThat(week(MONDAY, SUNDAY))
				.extracting(Evento::getNombre)
				.containsExactly("Primero", "Segundo", "Tercero");
	}

	@Test
	@DisplayName("la paginación parte la agenda en páginas sin perder ni duplicar eventos")
	void paginatesAgenda() {
		save("Primero", LocalDate.parse("2026-09-21"), LocalDate.parse("2026-09-21"));
		save("Segundo", LocalDate.parse("2026-09-22"), LocalDate.parse("2026-09-22"));
		save("Tercero", LocalDate.parse("2026-09-23"), LocalDate.parse("2026-09-23"));

		Page<Evento> firstPage = eventoRepository.findOverlapping(MONDAY, SUNDAY, PageRequest.of(0, 2));
		Page<Evento> secondPage = eventoRepository.findOverlapping(MONDAY, SUNDAY, PageRequest.of(1, 2));

		assertThat(firstPage.getContent()).extracting(Evento::getNombre).containsExactly("Primero", "Segundo");
		assertThat(secondPage.getContent()).extracting(Evento::getNombre).containsExactly("Tercero");
		assertThat(firstPage.getTotalElements()).isEqualTo(3);
		assertThat(firstPage.getTotalPages()).isEqualTo(2);
		assertThat(firstPage.isLast()).isFalse();
		assertThat(secondPage.isLast()).isTrue();
	}

	@Test
	@DisplayName("US5: devuelve solo los eventos del publicador pedido, ordenados por fecha de inicio")
	void findsEventsByPublisher() {
		Publicador other = publicadorRepository.save(Publicador.builder()
				.nombre("Otro publicador")
				.email("otro@cordoba.gob.ar")
				.build());
		save("Del otro", LocalDate.parse("2026-09-10"), LocalDate.parse("2026-09-11"), other);
		save("Segundo mío", LocalDate.parse("2026-09-23"), LocalDate.parse("2026-09-24"));
		save("Primero mío", LocalDate.parse("2026-09-22"), LocalDate.parse("2026-09-23"));

		Page<Evento> eventos = eventoRepository
				.findByPublicadorIdOrderByFechaInicioAsc(publisher.getId(), Pageable.unpaged());

		assertThat(eventos.getContent())
				.extracting(Evento::getNombre)
				.containsExactly("Primero mío", "Segundo mío");
	}

	@Test
	@DisplayName("US5: la paginación del publicador no mezcla los eventos de otro")
	void paginatesEventsByPublisher() {
		Publicador other = publicadorRepository.save(Publicador.builder()
				.nombre("Otro publicador")
				.email("otro@cordoba.gob.ar")
				.build());
		save("Mío primero", LocalDate.parse("2026-09-21"), LocalDate.parse("2026-09-21"));
		save("Mío segundo", LocalDate.parse("2026-09-22"), LocalDate.parse("2026-09-22"));
		save("Del otro", LocalDate.parse("2026-09-23"), LocalDate.parse("2026-09-23"), other);

		Page<Evento> firstPage = eventoRepository
				.findByPublicadorIdOrderByFechaInicioAsc(publisher.getId(), PageRequest.of(0, 1));

		assertThat(firstPage.getContent()).extracting(Evento::getNombre).containsExactly("Mío primero");
		assertThat(firstPage.getTotalElements()).isEqualTo(2);
	}

	@Test
	@DisplayName("US7: el listado completo ordena por fecha de inicio y, empatados, por hora de inicio")
	void ordersAllByStartDateThenStartTime() {
		// Sin el desempate por hora, los tres eventos del mismo día podrían volver en cualquier
		// orden y la grilla del frontend se vería desordenada entre recargas.
		saveTimed("Tarde", LocalDate.parse("2026-09-25"), LocalTime.of(18, 0));
		saveTimed("Temprano", LocalDate.parse("2026-09-25"), LocalTime.of(9, 0));
		saveTimed("Mañana", LocalDate.parse("2026-09-26"), LocalTime.of(7, 0));

		Page<Evento> eventos = eventoRepository
				.findAllByOrderByFechaInicioAscHorarioInicioAsc(Pageable.unpaged());

		assertThat(eventos.getContent())
				.extracting(Evento::getNombre)
				.containsExactly("Temprano", "Tarde", "Mañana");
	}

	@Test
	@DisplayName("US7: el listado completo no filtra por fechas: trae pasados y futuros")
	void listsAllEventsRegardlessOfDate() {
		// Contraste con la agenda: acá entra también lo que ya terminó y lo que todavía no empieza.
		save("Ya terminado", LocalDate.parse("2026-01-10"), LocalDate.parse("2026-01-11"));
		save("En curso", LocalDate.parse("2026-09-24"), LocalDate.parse("2026-09-26"));
		save("Dentro de un año", LocalDate.parse("2027-09-25"), LocalDate.parse("2027-09-26"));

		Page<Evento> eventos = eventoRepository
				.findAllByOrderByFechaInicioAscHorarioInicioAsc(Pageable.unpaged());

		assertThat(eventos.getContent())
				.extracting(Evento::getNombre)
				.containsExactly("Ya terminado", "En curso", "Dentro de un año");
	}

	@Test
	@DisplayName("US7: la paginación del listado completo parte los eventos sin perder ni duplicar")
	void paginatesAllEvents() {
		save("Primero", LocalDate.parse("2026-09-21"), LocalDate.parse("2026-09-21"));
		save("Segundo", LocalDate.parse("2026-09-22"), LocalDate.parse("2026-09-22"));
		save("Tercero", LocalDate.parse("2026-09-23"), LocalDate.parse("2026-09-23"));

		Page<Evento> firstPage = eventoRepository
				.findAllByOrderByFechaInicioAscHorarioInicioAsc(PageRequest.of(0, 2));
		Page<Evento> secondPage = eventoRepository
				.findAllByOrderByFechaInicioAscHorarioInicioAsc(PageRequest.of(1, 2));

		assertThat(firstPage.getContent()).extracting(Evento::getNombre).containsExactly("Primero", "Segundo");
		assertThat(secondPage.getContent()).extracting(Evento::getNombre).containsExactly("Tercero");
		assertThat(firstPage.getTotalElements()).isEqualTo(3);
		assertThat(firstPage.getTotalPages()).isEqualTo(2);
		assertThat(firstPage.isLast()).isFalse();
		assertThat(secondPage.isLast()).isTrue();
	}

	/** Consulta la agenda sin paginar, para que las aserciones lean sobre la lista completa. */
	private List<Evento> week(LocalDate from, LocalDate to) {
		return eventoRepository.findOverlapping(from, to, Pageable.unpaged()).getContent();
	}	private Evento save(String name, LocalDate from, LocalDate to) {
		return save(name, from, to, publisher);
	}

	private Evento save(String name, LocalDate from, LocalDate to, Publicador owner) {
		return eventoRepository.save(Evento.builder()
				.nombre(name)
				.categoria(Categoria.CULTURA)
				.localidad("Cosquín")
				.fechaInicio(from)
				.fechaFin(to)
				.publicador(owner)
				.build());
	}

	private Evento saveTimed(String name, LocalDate date, LocalTime startTime) {
		return eventoRepository.save(Evento.builder()
				.nombre(name)
				.categoria(Categoria.CULTURA)
				.localidad("Cosquín")
				.fechaInicio(date)
				.fechaFin(date)
				.horarioInicio(startTime)
				.horarioFin(startTime.plusHours(3))
				.publicador(publisher)
				.build());
	}

}
