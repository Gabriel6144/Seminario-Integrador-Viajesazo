package com.viajesazo.turismo_backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalTime;
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
import com.viajesazo.turismo_backend.dto.request.EventoRequest;
import com.viajesazo.turismo_backend.dto.response.EventoResponse;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.model.Categoria;
import com.viajesazo.turismo_backend.service.EventoService;

@WebMvcTest(EventoController.class)
// @WebMvcTest es un slice: solo carga beans web, así que el Clock que inyecta
// GlobalExceptionHandler no existiría. Se importa la configuración real en vez de duplicarla.
@Import(AppConfig.class)
class EventoControllerTest {

	private static final String VALID_BODY = """
			{
			  "nombre": "Festival de Folklore",
			  "descripcion": "Encuentro de syrigamis",
			  "categoria": "CULTURA",
			  "localidad": "Cosquín",
			  "direccion": "Plaza Pringles",
			  "fechaInicio": "2026-10-01",
			  "fechaFin": "2026-10-03",
			  "horarioInicio": "20:00:00",
			  "horarioFin": "23:30:00",
			  "imagenes": ["https://cdn.cordoba.gob.ar/folklore.jpg"],
			  "publicadorId": 1
			}
			""";

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private EventoService eventoService;

	@Test
	@DisplayName("US1: registra el evento y responde 201 con el evento creado")
	void createsEvent() throws Exception {
		when(eventoService.create(any(EventoRequest.class))).thenReturn(response());

		mockMvc.perform(post("/api/eventos").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(7))
				.andExpect(jsonPath("$.nombre").value("Festival de Folklore"))
				.andExpect(jsonPath("$.categoria").value("CULTURA"))
				.andExpect(jsonPath("$.fechaInicio").value("2026-10-01"))
				.andExpect(jsonPath("$.imagenes[0]").value("https://cdn.cordoba.gob.ar/folklore.jpg"))
				.andExpect(jsonPath("$.publicadorNombre").value("Turismo Córdoba"));
	}

	@Test
	@DisplayName("US1: un nombre vacío se rechaza con 400")
	void rejectsBlankName() throws Exception {
		String body = """
				{
				  "nombre": "",
				  "fechaInicio": "2026-10-01",
				  "fechaFin": "2026-10-03",
				  "publicadorId": 1
				}
				""";

		mockMvc.perform(post("/api/eventos").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("nombre")));
	}

	@Test
	@DisplayName("US1: sin fecha de inicio se rechaza con 400")
	void rejectsMissingStartDate() throws Exception {
		String body = """
				{
				  "nombre": "Festival",
				  "fechaFin": "2026-10-03",
				  "publicadorId": 1
				}
				""";

		mockMvc.perform(post("/api/eventos").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("fecha de inicio")));
	}

	@Test
	@DisplayName("una categoría inexistente se rechaza con 400 y no con 500")
	void rejectsUnknownCategory() throws Exception {
		String body = """
				{
				  "nombre": "Festival",
				  "categoria": "NO_EXISTE",
				  "fechaInicio": "2026-10-01",
				  "fechaFin": "2026-10-03",
				  "publicadorId": 1
				}
				""";

		mockMvc.perform(post("/api/eventos").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("un publicador inexistente devuelve 404")
	void returns404WhenPublisherNotFound() throws Exception {
		when(eventoService.create(any(EventoRequest.class)))
				.thenThrow(new ResourceNotFoundException("No existe el publicador con id 1"));

		mockMvc.perform(post("/api/eventos").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.message").value("No existe el publicador con id 1"));
	}

	@Test
	@DisplayName("un rango de fechas inválido devuelve 400")
	void returns400WhenRangeInvalid() throws Exception {
		when(eventoService.create(any(EventoRequest.class)))
				.thenThrow(new BusinessRuleException("la fecha de finalización no puede ser anterior a la de inicio"));

		mockMvc.perform(post("/api/eventos").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400));
	}

	@Test
	@DisplayName("US2: modifica el evento y responde 200")
	void updatesEvent() throws Exception {
		when(eventoService.update(eq(7L), any(EventoRequest.class))).thenReturn(response());

		mockMvc.perform(put("/api/eventos/7").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(7));
	}

	@Test
	@DisplayName("US2: modificar un evento inexistente devuelve 404")
	void returns404WhenUpdating() throws Exception {
		when(eventoService.update(eq(404L), any(EventoRequest.class)))
				.thenThrow(new ResourceNotFoundException("No existe el evento con id 404"));

		mockMvc.perform(put("/api/eventos/404").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("US3: la baja responde 204 sin cuerpo")
	void deletesEvent() throws Exception {
		mockMvc.perform(delete("/api/eventos/7"))
				.andExpect(status().isNoContent());

		verify(eventoService).delete(7L);
	}

	@Test
	@DisplayName("US3: dar de baja un evento inexistente devuelve 404")
	void returns404WhenDeleting() throws Exception {
		doThrow(new ResourceNotFoundException("No existe el evento con id 404"))
				.when(eventoService).delete(404L);

		mockMvc.perform(delete("/api/eventos/404"))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("US4: consulta el evento y responde 200")
	void findsEvent() throws Exception {
		when(eventoService.findById(7L)).thenReturn(response());

		mockMvc.perform(get("/api/eventos/7"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.nombre").value("Festival de Folklore"))
				.andExpect(jsonPath("$.localidad").value("Cosquín"));
	}

	@Test
	@DisplayName("US4: consultar un evento inexistente devuelve 404")
	void returns404WhenFinding() throws Exception {
		when(eventoService.findById(404L))
				.thenThrow(new ResourceNotFoundException("No existe el evento con id 404"));

		mockMvc.perform(get("/api/eventos/404"))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("US7: devuelve el listado completo de eventos, paginado")
	void returnsAllEvents() throws Exception {
		when(eventoService.findAll(any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(response()), PageRequest.of(0, 20), 1));

		mockMvc.perform(get("/api/eventos"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(1))
				.andExpect(jsonPath("$.content[0].nombre").value("Festival de Folklore"))
				// Mismo envelope que la agenda: los metadatos van anidados bajo "page"
				.andExpect(jsonPath("$.page.totalElements").value(1))
				.andExpect(jsonPath("$.page.size").value(20));
	}

	@Test
	@DisplayName("US7: ?page y ?size llegan al service y la respuesta los reporta de vuelta")
	void mapsQueryParamsToPageable() throws Exception {
		when(eventoService.findAll(any(Pageable.class))).thenAnswer(invocation -> {
			Pageable pageable = invocation.getArgument(0);
			return new PageImpl<>(List.of(), pageable, 45);
		});

		mockMvc.perform(get("/api/eventos").param("page", "2").param("size", "10"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page.number").value(2))
				.andExpect(jsonPath("$.page.size").value(10))
				.andExpect(jsonPath("$.page.totalElements").value(45))
				.andExpect(jsonPath("$.page.totalPages").value(5));
	}

	@Test
	@DisplayName("US7: no hay eventos cargados y devuelve una página vacía con 200, no un 404")
	void returnsEmptyPageWhenNoEvents() throws Exception {
		when(eventoService.findAll(any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

		mockMvc.perform(get("/api/eventos"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(0))
				.andExpect(jsonPath("$.page.totalElements").value(0));
	}

	private EventoResponse response() {
		return new EventoResponse(7L, "Festival de Folklore", "Encuentro de syrigamis", Categoria.CULTURA,
				"Cosquín", "Plaza Pringles", LocalDate.parse("2026-10-01"), LocalDate.parse("2026-10-03"),
				LocalTime.of(20, 0), LocalTime.of(23, 30),
				List.of("https://cdn.cordoba.gob.ar/folklore.jpg"), 1L, "Turismo Córdoba");
	}

}
