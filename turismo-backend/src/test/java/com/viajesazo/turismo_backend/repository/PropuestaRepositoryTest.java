package com.viajesazo.turismo_backend.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import com.viajesazo.turismo_backend.dto.request.PropuestaFiltro;
import com.viajesazo.turismo_backend.dto.response.PropuestaResumenContadoresResponse;
import com.viajesazo.turismo_backend.dto.response.PropuestaResumenResponse;
import com.viajesazo.turismo_backend.dto.response.ZonaResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.mapper.PropuestaResumenMapper;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.Disponibilidad;
import com.viajesazo.turismo_backend.model.EstadoPropuesta;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.Modalidad;
import com.viajesazo.turismo_backend.model.NombreEstado;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoPropuesta;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.service.PropuestaQueryService;

@DataJpaTest
class PropuestaRepositoryTest {

	private static final Clock FIXED_CLOCK = Clock.fixed(
			Instant.parse("2026-10-15T00:00:00Z"), ZoneOffset.UTC);

	@Autowired
	private PropuestaRepository propuestaRepository;

	@Autowired
	private PublicadorRepository publicadorRepository;

	@Autowired
	private EstadoPropuestaRepository estadoPropuestaRepository;

	@Autowired
	private UbicacionRepository ubicacionRepository;

	private PropuestaQueryService service;
	private Publicador publisher;
	private EstadoPropuesta initialState;
	private Ubicacion ubicacion;
	private Evento festival;
	private Evento maraton;
	private Actividad visita;
	private Actividad senderismo;

	@BeforeEach
	void setUp() {
		service = new PropuestaQueryService(propuestaRepository, new PropuestaResumenMapper(), FIXED_CLOCK);
		publisher = publicadorRepository.save(Publicador.builder()
				.nombre("Turismo Córdoba")
				.email("info@cordoba.gob.ar")
				.build());
		initialState = estadoPropuestaRepository.save(EstadoPropuesta.builder()
				.nombre("INICIADO")
				.descripcion("Propuesta iniciada")
				.build());
		ubicacion = ubicacionRepository.save(Ubicacion.builder()
				.ciudad("Cosquín")
				.localidad("Cosquín")
				.direccion("Av. San Martín 800")
				.latitud(new BigDecimal("-31.41350000"))
				.longitud(new BigDecimal("-64.49470000"))
				.build());

		festival = (Evento) propuestaRepository.save(evento("Festival de Folklore", "Música y danzas",
				TipoPropuesta.FESTIVAL, InteresCategoria.CULTURA, LocalDate.parse("2026-10-01"),
				LocalDate.parse("2026-10-03")));
		maraton = (Evento) propuestaRepository.save(evento("Maratón de las Sierras", "Carrera de montaña",
				TipoPropuesta.DEPORTIVO, InteresCategoria.NATURALEZA, LocalDate.parse("2026-11-10"),
				LocalDate.parse("2026-11-12")));
		visita = (Actividad) propuestaRepository.save(actividad("Visita guiada por el centro",
				"Recorrido histórico", TipoPropuesta.VISITA_GUIADA, InteresCategoria.CULTURA, 90));
		senderismo = (Actividad) propuestaRepository.save(actividad("Senderismo en las sierras",
				"Caminata guiada", TipoPropuesta.DEPORTIVO, InteresCategoria.NATURALEZA, 120));
	}

	@Test
	@DisplayName("US3: filtra por tipo EVENTO y no mezcla actividades")
	void filtersOnlyEvents() {
		Page<PropuestaResumenResponse> page = search(filtro(TipoRegistro.EVENTO, null, null, null, null, null, null),
				Sort.unsorted());

		assertThat(page.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactly("Festival de Folklore", "Maratón de las Sierras");
		assertThat(page.getContent()).extracting(PropuestaResumenResponse::tipo)
				.containsOnly(TipoRegistro.EVENTO);
		assertThat(page.getTotalElements()).isEqualTo(2);
	}

	@Test
	@DisplayName("US3: filtra por tipo ACTIVIDAD y devuelve la duración")
	void filtersOnlyActivities() {
		Page<PropuestaResumenResponse> page = search(filtro(TipoRegistro.ACTIVIDAD, null, null, null, null, null, null),
				Sort.unsorted());

		assertThat(page.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactly("Senderismo en las sierras", "Visita guiada por el centro");
		assertThat(page.getContent()).extracting(PropuestaResumenResponse::duracionMinutos)
				.containsExactly(120, 90);
		assertThat(page.getContent()).allSatisfy(item -> {
			assertThat(item.fechaInicio()).isNotNull();
			assertThat(item.tipo()).isEqualTo(TipoRegistro.ACTIVIDAD);
		});
	}

	@Test
	@DisplayName("US3: combina filtros de tipo de propuesta y categoria")
	void filtersByTypeAndCategory() {
		Page<PropuestaResumenResponse> page = search(
				filtro(null, TipoPropuesta.DEPORTIVO, InteresCategoria.NATURALEZA, null, null, null, null),
				Sort.unsorted());

		assertThat(page.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactlyInAnyOrder("Maratón de las Sierras", "Senderismo en las sierras");
	}

	@Test
	@DisplayName("US3: busca por texto en nombre y descripción")
	void searchesByText() {
		Page<PropuestaResumenResponse> page = search(filtro(null, null, null, "GUIADA", null, null, null),
				Sort.unsorted());

		assertThat(page.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactlyInAnyOrder("Visita guiada por el centro", "Senderismo en las sierras");
	}

	@Test
	@DisplayName("US3: la localidad se compara sin distinguir mayúsculas")
	void filtersByLocalidad() {
		Page<PropuestaResumenResponse> page = search(filtro(null, null, null, null, "cosquín", null, null),
				Sort.unsorted());

		assertThat(page.getTotalElements()).isEqualTo(4);
	}

	@Test
	@DisplayName("US3: filtra por publicador y estado")
	void filtersByPublisherAndState() {
		Page<PropuestaResumenResponse> page = search(
				new PropuestaFiltro(null, null, null, null, null, NombreEstado.INICIADO, publisher.getId(),
						null, null, null, null, null, null, false),
				Sort.unsorted());

		assertThat(page.getTotalElements()).isEqualTo(4);
	}

	@Test
	@DisplayName("US3: el rango de fechas usa solapamiento y solo aplica a eventos")
	void filtersByDateRange() {
		Page<PropuestaResumenResponse> page = search(
				filtro(TipoRegistro.EVENTO, null, null, null, null, LocalDate.parse("2026-10-15"), null),
				Sort.unsorted());

		assertThat(page.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactly("Maratón de las Sierras");
	}

	@Test
	@DisplayName("US3: el rango de fechas también aplica a actividades")
	void filtersByDateRangeAcrossEventsAndActivities() {
		Page<PropuestaResumenResponse> page = search(
				filtro(null, null, null, null, null, LocalDate.parse("2026-10-15"), null),
				Sort.unsorted());

		assertThat(page.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactlyInAnyOrder("Maratón de las Sierras",
						"Senderismo en las sierras", "Visita guiada por el centro");
	}

	@Test
	@DisplayName("US3: filtra por ciudad sin distinguir mayúsculas ni tildes")
	void filtersByCiudad() {
		PropuestaFiltro porCiudad = new PropuestaFiltro(null, null, null, null, null, null, null, null,
				"cosquin", null, null, null, null, false);

		assertThat(search(porCiudad, Sort.unsorted()).getTotalElements()).isEqualTo(4);
	}

	@Test
	@DisplayName("US3: la búsqueda de texto ignora tildes también en la localidad")
	void searchesByTextWithoutAccents() {
		Page<PropuestaResumenResponse> page = search(
				filtro(null, null, null, "cosquin", null, null, null), Sort.unsorted());

		assertThat(page.getTotalElements()).isEqualTo(4);
	}

	@Test
	@DisplayName("US3: el catálogo oculta las canceladas salvo que se pidan explícitamente")
	void excludesCancelledByDefault() {
		EstadoPropuesta cancelado = estadoPropuestaRepository.save(EstadoPropuesta.builder()
				.nombre("CANCELADO")
				.descripcion("Propuesta cancelada")
				.build());
		Evento canceladoEvent = evento("Evento cancelado", "No debe aparecer", TipoPropuesta.FERIA,
				InteresCategoria.CULTURA, LocalDate.parse("2026-10-20"), LocalDate.parse("2026-10-21"));
		canceladoEvent.setEstadoPropuesta(cancelado);
		propuestaRepository.save(canceladoEvent);

		assertThat(search(filtro(null, null, null, null, null, null, null), Sort.unsorted())
				.getContent()).extracting(PropuestaResumenResponse::nombre)
						.doesNotContain("Evento cancelado");

		PropuestaFiltro incluyendo = new PropuestaFiltro(null, null, null, null, null, null, null, null,
				null, null, null, null, null, true);
		assertThat(search(incluyendo, Sort.unsorted()).getContent())
				.extracting(PropuestaResumenResponse::nombre)
				.contains("Evento cancelado");

		PropuestaFiltro soloCanceladas = new PropuestaFiltro(null, null, null, null, null,
				NombreEstado.CANCELADO, null, null, null, null, null, null, null, false);
		assertThat(search(soloCanceladas, Sort.unsorted()).getContent())
				.extracting(PropuestaResumenResponse::nombre)
				.containsExactly("Evento cancelado");
	}

	@Test
	@DisplayName("US3: la paginación se aplica después de filtrar y el total es el filtrado")
	void paginatesFilteredResults() {
		PropuestaFiltro soloEventos = filtro(TipoRegistro.EVENTO, null, null, null, null, null, null);

		Page<PropuestaResumenResponse> first = service.search(soloEventos,
				PageRequest.of(0, 1, Sort.unsorted()));
		Page<PropuestaResumenResponse> second = service.search(soloEventos,
				PageRequest.of(1, 1, Sort.unsorted()));

		assertThat(first.getTotalElements()).isEqualTo(2);
		assertThat(first.getTotalPages()).isEqualTo(2);
		assertThat(first.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactly("Festival de Folklore");
		assertThat(second.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactly("Maratón de las Sierras");
	}

	@Test
	@DisplayName("US3: el resumen cuenta total, eventos y actividades con los filtros")
	void summaryCounts() {
		PropuestaResumenContadoresResponse summary = service
				.summary(filtro(null, null, null, null, null, null, null));

		assertThat(summary.total()).isEqualTo(4);
		assertThat(summary.eventos()).isEqualTo(2);
		assertThat(summary.actividades()).isEqualTo(2);
	}

	@Test
	@DisplayName("US3: las zonas devuelven ciudad y localidad distintas")
	void zonesAreDistinct() {
		Ubicacion jesusMaria = ubicacionRepository.save(Ubicacion.builder()
				.ciudad("Jesús María")
				.localidad("Jesús María")
				.direccion("Av. San Martín 100")
				.latitud(new BigDecimal("-30.98000000"))
				.longitud(new BigDecimal("-64.09000000"))
				.build());
		Evento pena = evento("Peña de Jesús María", "Música en vivo", TipoPropuesta.FESTIVAL,
				InteresCategoria.MUSICA, LocalDate.parse("2026-10-20"), LocalDate.parse("2026-10-21"));
		pena.setUbicacion(jesusMaria);
		propuestaRepository.save(pena);

		List<ZonaResponse> zonas = service.zones(null, false);

		assertThat(zonas).extracting(ZonaResponse::ciudad).contains("Cosquín", "Jesús María");
	}

	@Test
	@DisplayName("US3: ordena eventos por fecha de inicio")
	void sortsEventsByDate() {
		Page<PropuestaResumenResponse> page = search(filtro(TipoRegistro.EVENTO, null, null, null, null, null, null),
				Sort.by("fechaInicio"));

		assertThat(page.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactly("Festival de Folklore", "Maratón de las Sierras");
		assertThat(page.getTotalElements()).isEqualTo(2);
	}

	@Test
	@DisplayName("US3: ordena actividades por duración")
	void sortsActivitiesByDuration() {
		Page<PropuestaResumenResponse> page = search(
				filtro(TipoRegistro.ACTIVIDAD, null, null, null, null, null, null), Sort.by("duracionMinutos"));

		assertThat(page.getContent()).extracting(PropuestaResumenResponse::duracionMinutos)
				.containsExactly(90, 120);
	}

	@Test
	@DisplayName("US3: un orden de evento con tipo ACTIVIDAD se rechaza")
	void rejectsEventSortForActivities() {
		PropuestaFiltro filtro = filtro(TipoRegistro.ACTIVIDAD, null, null, null, null, null, null);

		assertThatThrownBy(() -> search(filtro, Sort.by("fechaInicio")))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("fechaInicio");
	}

	@Test
	@DisplayName("US3: un campo de orden desconocido se rechaza")
	void rejectsUnknownSort() {
		PropuestaFiltro filtro = filtro(null, null, null, null, null, null, null);

		assertThatThrownBy(() -> search(filtro, Sort.by("precio")))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("precio");
	}

	@Test
	@DisplayName("VZ-18 CA1: la agenda solo trae eventos y los ordena por fecha aunque pidan otro orden")
	void agendaReturnsOnlyEventsOrderedByDate() {
		Page<PropuestaResumenResponse> page = agenda(
				agendaFiltro(null, null, null, null, LocalDate.parse("2026-10-01"), null),
				Sort.by(Sort.Direction.DESC, "nombre"));

		assertThat(page.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactly("Festival de Folklore", "Maratón de las Sierras");
		assertThat(page.getContent()).extracting(PropuestaResumenResponse::tipo)
				.containsOnly(TipoRegistro.EVENTO);
	}

	@Test
	@DisplayName("VZ-18 CA1: por defecto la agenda excluye los eventos ya terminados")
	void agendaExcludesPastEventsByDefault() {
		Page<PropuestaResumenResponse> page = agenda(agendaFiltro(null, null, null, null, null, null),
				Sort.unsorted());

		assertThat(page.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactly("Maratón de las Sierras");
	}

	@Test
	@DisplayName("VZ-18 CA2: la agenda incluye eventos en curso dentro del rango de fechas")
	void agendaIncludesOngoingEventsInDateRange() {
		propuestaRepository.save(evento("Evento en curso", "Sigue vigente", TipoPropuesta.FERIA,
				InteresCategoria.CULTURA, LocalDate.parse("2026-10-10"), LocalDate.parse("2026-10-20")));

		Page<PropuestaResumenResponse> page = agenda(
				agendaFiltro(null, null, null, null, LocalDate.parse("2026-10-15"), LocalDate.parse("2026-10-16")),
				Sort.unsorted());

		assertThat(page.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactly("Evento en curso");
	}

	@Test
	@DisplayName("VZ-18 CA2: la ubicación busca en localidad, recinto y dirección sin tildes")
	void agendaFiltersByUbicacionText() {
		Ubicacion jesusMaria = ubicacionRepository.save(Ubicacion.builder()
				.ciudad("Jesús María")
				.localidad("Jesús María")
				.direccion("Av. San Martín 100")
				.latitud(new BigDecimal("-30.98000000"))
				.longitud(new BigDecimal("-64.09000000"))
				.build());
		Evento pena = evento("Peña de Jesús María", "Música en vivo", TipoPropuesta.FESTIVAL,
				InteresCategoria.MUSICA, LocalDate.parse("2026-10-20"), LocalDate.parse("2026-10-21"));
		pena.setUbicacion(jesusMaria);
		pena.setLugarRecinto("Plaza San Martín");
		propuestaRepository.save(pena);

		assertThat(agenda(agendaFiltro(null, null, null, "jesus maria", null, null), Sort.unsorted())
				.getContent()).extracting(PropuestaResumenResponse::nombre)
						.containsExactly("Peña de Jesús María");
		assertThat(agenda(agendaFiltro(null, null, null, "plaza san martin", null, null), Sort.unsorted())
				.getContent()).extracting(PropuestaResumenResponse::nombre)
						.containsExactly("Peña de Jesús María");
		assertThat(agenda(agendaFiltro(null, null, null, "san martin 100", null, null), Sort.unsorted())
				.getContent()).extracting(PropuestaResumenResponse::nombre)
						.containsExactly("Peña de Jesús María");
	}

	@Test
	@DisplayName("VZ-18 CA2: combina tipo de propuesta, categoría y tipo de acceso")
	void agendaFiltersByTypeCategoryAndAccess() {
		Evento jazz = evento("Festival de Jazz", "Música", TipoPropuesta.FESTIVAL,
				InteresCategoria.MUSICA, LocalDate.parse("2026-10-20"), LocalDate.parse("2026-10-21"));
		jazz.setTipoAcceso(TipoAcceso.DE_PAGO);
		jazz.setMontoEstimado(new BigDecimal("15000"));
		jazz.setSitioOficial("https://jazz.example.com");
		propuestaRepository.save(jazz);

		Page<PropuestaResumenResponse> page = agenda(
				agendaFiltro(TipoPropuesta.FESTIVAL, InteresCategoria.MUSICA, TipoAcceso.DE_PAGO, null, null, null),
				Sort.unsorted());

		assertThat(page.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactly("Festival de Jazz");
	}

	@Test
	@DisplayName("VZ-18 CA2: la agenda excluye las propuestas canceladas")
	void agendaExcludesCancelledEvents() {
		EstadoPropuesta cancelado = estadoPropuestaRepository.save(EstadoPropuesta.builder()
				.nombre("CANCELADO")
				.descripcion("Propuesta cancelada")
				.build());
		Evento canceladoEvent = evento("Evento cancelado", "No debe aparecer", TipoPropuesta.FERIA,
				InteresCategoria.CULTURA, LocalDate.parse("2026-10-20"), LocalDate.parse("2026-10-21"));
		canceladoEvent.setEstadoPropuesta(cancelado);
		propuestaRepository.save(canceladoEvent);

		Page<PropuestaResumenResponse> page = agenda(agendaFiltro(null, null, null, null, null, null),
				Sort.unsorted());

		assertThat(page.getContent()).extracting(PropuestaResumenResponse::nombre)
				.containsExactly("Maratón de las Sierras");
	}

	private Page<PropuestaResumenResponse> search(PropuestaFiltro filtro, Sort sort) {
		Pageable pageable = PageRequest.of(0, 20, sort);
		return service.search(filtro, pageable);
	}

	private Page<PropuestaResumenResponse> agenda(PropuestaFiltro filtro, Sort sort) {
		Pageable pageable = PageRequest.of(0, 20, sort);
		return service.searchAgenda(filtro, pageable);
	}

	private PropuestaFiltro filtro(TipoRegistro tipo, TipoPropuesta tipoPropuesta, InteresCategoria categoria,
			String q, String localidad, LocalDate fechaDesde, LocalDate fechaHasta) {
		return new PropuestaFiltro(tipo, tipoPropuesta, categoria, null, null, null, null, localidad, null,
				null, q, fechaDesde, fechaHasta, false);
	}

	private PropuestaFiltro agendaFiltro(TipoPropuesta tipoPropuesta, InteresCategoria categoria,
			TipoAcceso tipoAcceso, String ubicacion, LocalDate fechaDesde, LocalDate fechaHasta) {
		return new PropuestaFiltro(TipoRegistro.EVENTO, tipoPropuesta, categoria, null, tipoAcceso, null, null,
				null, null, ubicacion, null, fechaDesde, fechaHasta, false);
	}

	private Evento evento(String nombre, String descripcion, TipoPropuesta tipoPropuesta,
			InteresCategoria categoria, LocalDate inicio, LocalDate fin) {
		Evento evento = new Evento();
		evento.setNombre(nombre);
		evento.setDescripcion(descripcion);
		evento.setTipoPropuesta(tipoPropuesta);
		evento.setCategoria(categoria);
		evento.setModalidad(Modalidad.PEDESTRE);
		evento.setTipoAcceso(TipoAcceso.GRATUITO);
		evento.setEstadoPropuesta(initialState);
		evento.setPublicador(publisher);
		evento.setUbicacion(ubicacion);
		evento.setLugarRecinto("Plaza Próspero Molina");
		evento.setFechaInicio(inicio);
		evento.setFechaFin(fin);
		evento.setHorarioInicio(LocalTime.of(20, 0));
		evento.setHorarioFin(LocalTime.of(23, 0));
		evento.setImagenes(new java.util.ArrayList<>(List.of("https://cdn.test/evento.jpg")));
		return evento;
	}

	private Actividad actividad(String nombre, String descripcion, TipoPropuesta tipoPropuesta,
			InteresCategoria categoria, int duracion) {
		Actividad actividad = new Actividad();
		actividad.setNombre(nombre);
		actividad.setDescripcion(descripcion);
		actividad.setTipoPropuesta(tipoPropuesta);
		actividad.setCategoria(categoria);
		actividad.setModalidad(Modalidad.PEDESTRE);
		actividad.setTipoAcceso(TipoAcceso.GRATUITO);
		actividad.setEstadoPropuesta(initialState);
		actividad.setPublicador(publisher);
		actividad.setUbicacion(ubicacion);
		actividad.setLugarRecinto("Cabildo");
		actividad.setDuracionMinutos(duracion);
		actividad.setFechaInicio(LocalDate.parse("2026-10-01"));
		actividad.setFechaFin(LocalDate.parse("2026-12-31"));
		actividad.setDisponibilidades(List.of(Disponibilidad.builder()
				.diaSemana(java.time.DayOfWeek.MONDAY)
				.horaInicio(LocalTime.of(9, 0))
				.horaFin(LocalTime.of(12, 0))
				.build()));
		return actividad;
	}
}
