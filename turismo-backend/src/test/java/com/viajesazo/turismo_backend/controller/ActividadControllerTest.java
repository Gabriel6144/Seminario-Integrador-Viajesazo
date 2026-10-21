package com.viajesazo.turismo_backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.viajesazo.turismo_backend.config.AppConfig;
import com.viajesazo.turismo_backend.dto.request.ActividadRequest;
import com.viajesazo.turismo_backend.dto.response.ActividadResponse;
import com.viajesazo.turismo_backend.dto.response.DisponibilidadResponse;
import com.viajesazo.turismo_backend.exception.InvariantViolationException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.EstadoPropuesta;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.Modalidad;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoPropuesta;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.service.ActividadService;

@WebMvcTest(ActividadController.class)
@Import(AppConfig.class)
class ActividadControllerTest {

	private static final String VALID_BODY = """
			{
			  "nombre": "Visita guiada",
			  "descripcion": "Recorrido por el centro histórico",
			  "categoria": "CULTURA",
			  "modalidad": "PEDESTRE",
			  "tipoPropuesta": "VISITA_GUIADA",
			  "tipoAcceso": "GRATUITO",
			  "lugarRecinto": "Cabildo",
			  "localidad": "Cosquín",
			  "direccion": "Av. San Martín 800",
			  "duracionMinutos": 90,
			  "disponibilidades": [
			    {"diaSemana": "MONDAY", "horaInicio": "09:00:00", "horaFin": "11:00:00"}
			  ],
			  "imagenes": ["https://cdn.cordoba.gob.ar/cabildo.jpg"],
			  "publicadorId": 1
			}
			""";

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private ActividadService actividadService;

	@Test
	@DisplayName("US2: registra la actividad y responde 201 con tipo ACTIVIDAD")
	void createsActivity() throws Exception {
		when(actividadService.create(any(ActividadRequest.class))).thenReturn(response());

		mockMvc.perform(post("/api/actividades").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(7))
				.andExpect(jsonPath("$.tipo").value("ACTIVIDAD"))
				.andExpect(jsonPath("$.nombre").value("Visita guiada"))
				.andExpect(jsonPath("$.duracionMinutos").value(90))
				.andExpect(jsonPath("$.disponibilidades[0].diaSemana").value("MONDAY"))
				.andExpect(jsonPath("$.publicadorNombre").value("Turismo Córdoba"));
	}

	@Test
	@DisplayName("US2: un nombre vacío se rechaza con 400")
	void rejectsBlankName() throws Exception {
		String body = """
				{
				  "nombre": "",
				  "localidad": "Cosquín",
				  "direccion": "Av. San Martín 800",
				  "duracionMinutos": 90,
				  "publicadorId": 1
				}
				""";

		mockMvc.perform(post("/api/actividades").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("nombre")));
	}

	@Test
	@DisplayName("US2: sin publicador se rechaza con 400")
	void rejectsMissingPublisher() throws Exception {
		String body = """
				{
				  "nombre": "Visita guiada",
				  "localidad": "Cosquín",
				  "direccion": "Av. San Martín 800",
				  "duracionMinutos": 90
				}
				""";

		mockMvc.perform(post("/api/actividades").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("publicador")));
	}

	@Test
	@DisplayName("US2: devuelve 404 cuando la actividad no existe")
	void returnsNotFound() throws Exception {
		when(actividadService.findById(99L)).thenThrow(new ResourceNotFoundException("No existe la actividad con id 99"));

		mockMvc.perform(get("/api/actividades/99"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404));
	}

	@Test
	@DisplayName("US2: lista las actividades paginadas")
	void listsActivities() throws Exception {
		Pageable pageable = PageRequest.of(0, 20);
		when(actividadService.findAll(any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(response()), pageable, 1));

		mockMvc.perform(get("/api/actividades"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(1))
				.andExpect(jsonPath("$.content[0].tipo").value("ACTIVIDAD"))
				.andExpect(jsonPath("$.page.totalElements").value(1));
	}

	@Test
	@DisplayName("US2: elimina la actividad con 204")
	void deletesActivity() throws Exception {
		mockMvc.perform(delete("/api/actividades/7")).andExpect(status().isNoContent());
	}

	@Test
	@DisplayName("US2: un invariante violado responde 422 problem+json")
	void returnsUnprocessableEntityForInvariant() throws Exception {
		when(actividadService.create(any(ActividadRequest.class)))
				.thenThrow(new InvariantViolationException("la duración de la actividad debe ser mayor a cero"));

		mockMvc.perform(post("/api/actividades").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
				.andExpect(status().isUnprocessableEntity())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.status").value(422))
				.andExpect(jsonPath("$.title").value("Regla de dominio incumplida"))
				.andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("duración")));
	}

	@Test
	@DisplayName("US2: un conflicto de versión responde 409 problem+json")
	void returnsConflictForOptimisticLock() throws Exception {
		when(actividadService.update(eq(7L), any(ActividadRequest.class)))
				.thenThrow(new ObjectOptimisticLockingFailureException(Actividad.class, 7L));

		mockMvc.perform(put("/api/actividades/7").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
				.andExpect(status().isConflict())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.title").value("Conflicto de concurrencia"));
	}

	private ActividadResponse response() {
		return new ActividadResponse(7L, TipoRegistro.ACTIVIDAD, "Visita guiada",
				"Recorrido por el centro histórico", TipoPropuesta.VISITA_GUIADA, InteresCategoria.CULTURA,
				Modalidad.PEDESTRE, TipoAcceso.GRATUITO, estado(), "Cabildo", "Cosquín", "Av. San Martín 800",
				new BigDecimal("-31.41350000"), new BigDecimal("-64.49470000"), 90,
				List.of(new DisponibilidadResponse(DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(11, 0))),
				List.of("https://cdn.cordoba.gob.ar/cabildo.jpg"), 1L, "Turismo Córdoba");
	}

	private EstadoPropuesta estado() {
		return EstadoPropuesta.builder().id(1L).nombre("INICIADO").build();
	}
}
