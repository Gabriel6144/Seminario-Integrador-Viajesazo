package com.viajesazo.turismo_backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.viajesazo.turismo_backend.config.AppConfig;
import com.viajesazo.turismo_backend.dto.response.EventoResponse;
import com.viajesazo.turismo_backend.model.Categoria;
import com.viajesazo.turismo_backend.service.EventoService;

@WebMvcTest(AgendaController.class)
// @WebMvcTest es un slice: solo carga beans web, así que el Clock que inyecta
// GlobalExceptionHandler no existiría. Se importa la configuración real en vez de duplicarla.
@Import(AppConfig.class)
class AgendaControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private EventoService eventoService;

	@Test
	@DisplayName("US6: devuelve la agenda semanal en orden, dentro de la página pedida")
	void returnsWeeklyAgenda() throws Exception {
		when(eventoService.findWeeklyAgenda(any(Pageable.class)))
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
		when(eventoService.findWeeklyAgenda(any(Pageable.class)))
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
		when(eventoService.findWeeklyAgenda(any(Pageable.class))).thenAnswer(invocation -> {
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
		when(eventoService.findWeeklyAgenda(any(Pageable.class))).thenAnswer(invocation -> {
			Pageable pageable = invocation.getArgument(0);
			return new PageImpl<>(List.of(), pageable, 0);
		});

		mockMvc.perform(get("/api/agenda/semanal").param("size", "100000"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.size").value(100));
	}

	private EventoResponse event(Long id, String nombre, LocalDate fecha) {
		return new EventoResponse(id, nombre, null, Categoria.CULTURA, "Cosquín", null,
				fecha, fecha, null, null, List.of(), 1L, "Turismo Córdoba");
	}

}
