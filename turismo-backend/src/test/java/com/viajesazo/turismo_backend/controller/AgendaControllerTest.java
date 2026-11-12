package com.viajesazo.turismo_backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.viajesazo.turismo_backend.config.AppConfig;
import com.viajesazo.turismo_backend.dto.request.PropuestaFiltro;
import com.viajesazo.turismo_backend.dto.response.EventoResponse;
import com.viajesazo.turismo_backend.dto.response.PropuestaResumenResponse;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.Modalidad;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoPropuesta;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.service.PropuestaQueryService;
import com.viajesazo.turismo_backend.service.PropuestaService;

@WebMvcTest(AgendaController.class)
// @WebMvcTest es un slice: solo carga beans web, así que el Clock que inyecta
// GlobalExceptionHandler no existiría. Se importa la configuración real en vez de duplicarla.
@Import(AppConfig.class)
class AgendaControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private PropuestaService propuestaService;

	@MockitoBean
	private PropuestaQueryService propuestaQueryService;

	@Test
	@DisplayName("VZ-18: la agenda propaga todos los filtros al service")
	void propagatesAgendaFilters() throws Exception {
		when(propuestaQueryService.searchAgenda(any(PropuestaFiltro.class), any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(resumen()), PageRequest.of(0, 20), 1));

		mockMvc.perform(get("/api/agenda")
						.param("tipoPropuesta", "FESTIVAL")
						.param("categoria", "CULTURA")
						.param("tipoAcceso", "DE_PAGO")
						.param("ubicacion", "Cosquín")
						.param("fechaDesde", "2026-10-01")
						.param("fechaHasta", "2026-10-31")
						.param("page", "0")
						.param("size", "10"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(1))
				.andExpect(jsonPath("$.content[0].nombre").value("Festival de Folklore"))
				.andExpect(jsonPath("$.page.totalElements").value(1));

		ArgumentCaptor<PropuestaFiltro> captor = ArgumentCaptor.forClass(PropuestaFiltro.class);
		org.mockito.Mockito.verify(propuestaQueryService).searchAgenda(captor.capture(), any(Pageable.class));
		PropuestaFiltro filtro = captor.getValue();
		org.assertj.core.api.Assertions.assertThat(filtro.tipo()).isEqualTo(TipoRegistro.EVENTO);
		org.assertj.core.api.Assertions.assertThat(filtro.tipoPropuesta()).isEqualTo(TipoPropuesta.FESTIVAL);
		org.assertj.core.api.Assertions.assertThat(filtro.categoria()).isEqualTo(InteresCategoria.CULTURA);
		org.assertj.core.api.Assertions.assertThat(filtro.tipoAcceso()).isEqualTo(TipoAcceso.DE_PAGO);
		org.assertj.core.api.Assertions.assertThat(filtro.ubicacion()).isEqualTo("Cosquín");
		org.assertj.core.api.Assertions.assertThat(filtro.fechaDesde()).isEqualTo(LocalDate.parse("2026-10-01"));
		org.assertj.core.api.Assertions.assertThat(filtro.fechaHasta()).isEqualTo(LocalDate.parse("2026-10-31"));
	}

	@Test
	@DisplayName("VZ-18: un tipo de propuesta inexistente responde 400")
	void rejectsUnknownAgendaType() throws Exception {
		mockMvc.perform(get("/api/agenda").param("tipoPropuesta", "NO_EXISTE"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400));
	}

	@Test
	@DisplayName("VZ-18: una fecha inválida responde 400")
	void rejectsInvalidAgendaDate() throws Exception {
		mockMvc.perform(get("/api/agenda").param("fechaDesde", "no-es-fecha"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400));
	}

	@Test
	@DisplayName("US6: devuelve la agenda semanal en orden, dentro de la página pedida")
	void returnsWeeklyAgenda() throws Exception {
		when(propuestaService.findWeeklyAgenda(any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(
						event(7L, "Festival de Folklore", LocalDate.parse("2026-09-25")),
						event(8L, "Exposición de artesanías", LocalDate.parse("2026-09-26"))),
						PageRequest.of(0, 20), 2));

		mockMvc.perform(get("/api/agenda/semanal"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(2))
				.andExpect(jsonPath("$.content[0].nombre").value("Festival de Folklore"))
				.andExpect(jsonPath("$.content[1].nombre").value("Exposición de artesanías"))
				// PagedModel anida los metadatos de la página bajo "page"
				.andExpect(jsonPath("$.page.totalElements").value(2))
				.andExpect(jsonPath("$.page.totalPages").value(1))
				.andExpect(jsonPath("$.page.number").value(0))
				// 20 es el default-page-size de application.properties
				.andExpect(jsonPath("$.page.size").value(20));
	}

	@Test
	@DisplayName("US6: si no hay eventos en la semana devuelve una página vacía")
	void returnsEmptyAgenda() throws Exception {
		when(propuestaService.findWeeklyAgenda(any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

		mockMvc.perform(get("/api/agenda/semanal"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(0))
				.andExpect(jsonPath("$.page.totalElements").value(0));
	}

	@Test
	@DisplayName("US6: ?page y ?size se traducen al Pageable del service y vuelven en la respuesta")
	void mapsQueryParamsToPageable() throws Exception {
		// El echo del Pageable muestra el viaje redondo: lo que el controller arma de la query
		// es lo que el service recibe y lo que la respuesta termina reportando.
		when(propuestaService.findWeeklyAgenda(any(Pageable.class))).thenAnswer(invocation -> {
			Pageable pageable = invocation.getArgument(0);
			return new PageImpl<>(List.of(), pageable, 17);
		});

		mockMvc.perform(get("/api/agenda/semanal").param("page", "2").param("size", "5"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.number").value(2))
				.andExpect(jsonPath("$.page.size").value(5))
				.andExpect(jsonPath("$.page.totalElements").value(17))
				.andExpect(jsonPath("$.page.totalPages").value(4));
	}

	@Test
	@DisplayName("un size por encima del máximo se recorta al tope configurado en vez de reventar")
	void clampsSizeToMax() throws Exception {
		when(propuestaService.findWeeklyAgenda(any(Pageable.class))).thenAnswer(invocation -> {
			Pageable pageable = invocation.getArgument(0);
			return new PageImpl<>(List.of(), pageable, 0);
		});

		mockMvc.perform(get("/api/agenda/semanal").param("size", "100000"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.size").value(100));
	}

	private PropuestaResumenResponse resumen() {
		return new PropuestaResumenResponse(7L, TipoRegistro.EVENTO, "Festival de Folklore",
				"Música y danzas", TipoPropuesta.FESTIVAL, InteresCategoria.CULTURA, Modalidad.PEDESTRE,
				TipoAcceso.GRATUITO, null, "Plaza Próspero Molina", "Cosquín", "Av. San Martín 800",
				new BigDecimal("-31.41350000"), new BigDecimal("-64.49470000"), LocalDate.parse("2026-10-01"),
				LocalDate.parse("2026-10-03"), null, null, null, List.of(), 1L, "Turismo Córdoba");
	}

	private EventoResponse event(Long id, String nombre, LocalDate fecha) {
		return new EventoResponse(id, TipoRegistro.EVENTO, nombre, null, TipoPropuesta.FESTIVAL, InteresCategoria.CULTURA, null, null, null, null, null, null,
				"Cosquín", null, null, null, null, fecha, fecha, null, null, List.of(), 1L, "Turismo Córdoba");
	}

}
