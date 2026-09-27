package com.viajesazo.turismo_backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.viajesazo.turismo_backend.config.AppConfig;
import com.viajesazo.turismo_backend.dto.response.EventoResponse;
import com.viajesazo.turismo_backend.dto.request.PublicadorRequest;
import com.viajesazo.turismo_backend.dto.response.PublicadorResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.model.Categoria;
import com.viajesazo.turismo_backend.service.EventoService;
import com.viajesazo.turismo_backend.service.PublicadorService;

@WebMvcTest(PublicadorController.class)
// @WebMvcTest es un slice: solo carga beans web, así que el Clock que inyecta
// GlobalExceptionHandler no existiría. Se importa la configuración real en vez de duplicarla.
@Import(AppConfig.class)
class PublicadorControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private PublicadorService publicadorService;

	@MockitoBean
	private EventoService eventoService;

	@Test
	@DisplayName("registra el publicador y responde 201")
	void createsPublisher() throws Exception {
		when(publicadorService.create(any(PublicadorRequest.class)))
				.thenReturn(new PublicadorResponse(1L, "Turismo Córdoba", "info@cordoba.gob.ar", "0351-1234567"));

		mockMvc.perform(post("/api/publicadores")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "nombre": "Turismo Córdoba",
								  "email": "info@cordoba.gob.ar",
								  "telefono": "0351-1234567"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.email").value("info@cordoba.gob.ar"));
	}

	@Test
	@DisplayName("un email con formato inválido se rechaza con 400")
	void rejectsInvalidEmail() throws Exception {
		mockMvc.perform(post("/api/publicadores")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "nombre": "Turismo Córdoba",
								  "email": "esto-no-es-un-email"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("email")));
	}

	@Test
	@DisplayName("un email ya registrado se rechaza con 400 y el mensaje dice qué corregir")
	void rejectsDuplicateEmail() throws Exception {
		// El service mockeado lanza lo que lanza el pre-chequeo real. Lo que se verifica acá es el
		// cableado controller -> GlobalExceptionHandler: que la regla llegue al cliente como 400 y
		// no como el 500 que devolvía cuando la constraint reventaba sin handler.
		when(publicadorService.create(any(PublicadorRequest.class)))
				.thenThrow(new BusinessRuleException("ya existe un publicador con ese email"));

		mockMvc.perform(post("/api/publicadores")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "nombre": "Turismo Córdoba",
								  "email": "info@cordoba.gob.ar"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("ya existe un publicador con ese email"));
	}

	@Test
	@DisplayName("consulta el publicador y responde 200")
	void findsPublisher() throws Exception {
		when(publicadorService.findById(1L))
				.thenReturn(new PublicadorResponse(1L, "Turismo Córdoba", "info@cordoba.gob.ar", null));

		mockMvc.perform(get("/api/publicadores/1"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.nombre").value("Turismo Córdoba"));
	}

	@Test
	@DisplayName("US5: devuelve los eventos del publicador en la ruta anidada, paginados")
	void returnsPublisherEvents() throws Exception {
		when(eventoService.findByPublicadorId(eq(1L), any(Pageable.class))).thenReturn(
				new PageImpl<>(List.of(new EventoResponse(7L, "Festival de Folklore", null, Categoria.CULTURA,
						"Cosquín", null, LocalDate.parse("2026-10-01"), LocalDate.parse("2026-10-03"),
						null, null, List.of(), 1L, "Turismo Córdoba")), PageRequest.of(0, 20), 1));

		mockMvc.perform(get("/api/publicadores/1/eventos"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(1))
				.andExpect(jsonPath("$.content[0].nombre").value("Festival de Folklore"))
				.andExpect(jsonPath("$.page.totalElements").value(1))
				.andExpect(jsonPath("$.page.size").value(20));
	}

	@Test
	@DisplayName("US5: un publicador sin eventos devuelve una página vacía, no un 404")
	void returnsEmptyPageWhenNoEvents() throws Exception {
		when(eventoService.findByPublicadorId(eq(1L), any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

		mockMvc.perform(get("/api/publicadores/1/eventos"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(0));
	}

	@Test
	@DisplayName("US5: consultar los eventos de un publicador inexistente devuelve 404")
	void returns404WhenPublisherNotFound() throws Exception {
		when(eventoService.findByPublicadorId(eq(404L), any(Pageable.class)))
				.thenThrow(new ResourceNotFoundException("No existe el publicador con id 404"));

		mockMvc.perform(get("/api/publicadores/404/eventos"))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("US7: devuelve el listado completo de publicadores, paginado")
	void returnsAllPublishers() throws Exception {
		when(publicadorService.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(
				new PublicadorResponse(1L, "Turismo Córdoba", "info@cordoba.gob.ar", "0351-1234567"),
				new PublicadorResponse(2L, "Municipalidad de Cosquín", "cosquin@cordoba.gob.ar", null)),
				PageRequest.of(0, 20), 2));

		mockMvc.perform(get("/api/publicadores"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(2))
				.andExpect(jsonPath("$.content[0].nombre").value("Turismo Córdoba"))
				.andExpect(jsonPath("$.content[1].nombre").value("Municipalidad de Cosquín"))
				// Mismo envelope que la agenda: los metadatos van anidados bajo "page"
				.andExpect(jsonPath("$.page.totalElements").value(2))
				.andExpect(jsonPath("$.page.size").value(20));
	}

	@Test
	@DisplayName("US7: ?page y ?size llegan al service y la respuesta los reporta de vuelta")
	void mapsQueryParamsToPageable() throws Exception {
		when(publicadorService.findAll(any(Pageable.class))).thenAnswer(invocation -> {
			Pageable pageable = invocation.getArgument(0);
			return new PageImpl<>(List.of(), pageable, 12);
		});

		mockMvc.perform(get("/api/publicadores").param("page", "1").param("size", "4"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.number").value(1))
				.andExpect(jsonPath("$.page.size").value(4))
				.andExpect(jsonPath("$.page.totalElements").value(12))
				.andExpect(jsonPath("$.page.totalPages").value(3));
	}

	@Test
	@DisplayName("US7: no hay publicadores cargados y devuelve una página vacía con 200, no un 404")
	void returnsEmptyPageWhenNoPublishers() throws Exception {
		when(publicadorService.findAll(any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

		mockMvc.perform(get("/api/publicadores"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(0))
				.andExpect(jsonPath("$.page.totalElements").value(0));
	}

}
