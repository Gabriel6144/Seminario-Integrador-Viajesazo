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
import com.viajesazo.turismo_backend.dto.request.ViajeRequest;
import com.viajesazo.turismo_backend.dto.response.UbicacionResponse;
import com.viajesazo.turismo_backend.dto.response.ViajeResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import com.viajesazo.turismo_backend.service.ViajeService;

@WebMvcTest(ViajeController.class)
// @WebMvcTest es un slice: sin el import, el Clock que usa GlobalExceptionHandler no existiría.
@Import(AppConfig.class)
class ViajeControllerTest {

	private static final String USUARIO = "turista@test.com";

	private static final String VALID_BODY = """
			{
			  "nombre": "Escapada serrana",
			  "ubicacion": {
			    "latitud": -31.95,
			    "longitud": -64.55,
			    "ciudad": "Villa General Belgrano",
			    "localidad": "Córdoba"
			  },
			  "rangoInteresKm": 35,
			  "fechaInicio": "2026-10-20",
			  "fechaFin": "2026-10-22",
			  "ritmo": "EQUILIBRADO",
			  "interesesCategoria": ["CULTURA"],
			  "usuario": "turista@test.com"
			}
			""";

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private ViajeService viajeService;

	@Test
	@DisplayName("VZ-19: registra el viaje y responde 201 con el viaje creado")
	void createsTrip() throws Exception {
		when(viajeService.create(any(ViajeRequest.class))).thenReturn(response());

		mockMvc.perform(post("/api/viajes").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(7))
				.andExpect(jsonPath("$.nombre").value("Escapada serrana"))
				.andExpect(jsonPath("$.estado").value("PLANIFICADO"))
				.andExpect(jsonPath("$.fechaInicio").value("2026-10-20"))
				.andExpect(jsonPath("$.ubicacion.ciudad").value("Villa General Belgrano"));
	}

	@Test
	@DisplayName("VZ-19 CA2: un nombre vacío se rechaza con 400")
	void rejectsBlankName() throws Exception {
		String body = """
				{
				  "nombre": "",
				  "ubicacion": {"latitud": -31.95, "longitud": -64.55, "ciudad": "Villa General Belgrano"},
				  "rangoInteresKm": 35,
				  "fechaInicio": "2026-10-20",
				  "fechaFin": "2026-10-22",
				  "ritmo": "EQUILIBRADO",
				  "usuario": "turista@test.com"
				}
				""";

		mockMvc.perform(post("/api/viajes").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("nombre")));
	}

	@Test
	@DisplayName("VZ-19 CA2: sin fecha de inicio se rechaza con 400")
	void rejectsMissingStartDate() throws Exception {
		String body = """
				{
				  "nombre": "Escapada",
				  "ubicacion": {"latitud": -31.95, "longitud": -64.55, "ciudad": "Villa General Belgrano"},
				  "rangoInteresKm": 35,
				  "fechaFin": "2026-10-22",
				  "ritmo": "EQUILIBRADO",
				  "usuario": "turista@test.com"
				}
				""";

		mockMvc.perform(post("/api/viajes").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("fecha de inicio")));
	}

	@Test
	@DisplayName("VZ-19 CA5: un body mal formado se rechaza con 400")
	void rejectsUnreadableBody() throws Exception {
		String body = """
				{ "nombre": "Escapada", "ritmo": "NO_EXISTE" }
				""";

		mockMvc.perform(post("/api/viajes").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("VZ-19 CA3: un rango de fechas inválido devuelve 400")
	void returns400WhenRangeInvalid() throws Exception {
		when(viajeService.create(any(ViajeRequest.class)))
				.thenThrow(new BusinessRuleException("la fecha de finalización no puede ser anterior a la de inicio"));

		mockMvc.perform(post("/api/viajes").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400));
	}

	@Test
	@DisplayName("VZ-21: modifica el viaje y responde 200")
	void updatesTrip() throws Exception {
		when(viajeService.update(eq(7L), any(ViajeRequest.class))).thenReturn(response());

		mockMvc.perform(put("/api/viajes/7").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(7));
	}

	@Test
	@DisplayName("VZ-21: modificar un viaje inexistente devuelve 404")
	void returns404WhenUpdating() throws Exception {
		when(viajeService.update(eq(404L), any(ViajeRequest.class)))
				.thenThrow(new ResourceNotFoundException("No existe el viaje con id 404"));

		mockMvc.perform(put("/api/viajes/404").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("VZ-23: la baja lógica responde 204 sin cuerpo")
	void deletesTrip() throws Exception {
		mockMvc.perform(delete("/api/viajes/7"))
				.andExpect(status().isNoContent());

		verify(viajeService).delete(7L);
	}

	@Test
	@DisplayName("VZ-23: dar de baja un viaje inexistente devuelve 404")
	void returns404WhenDeleting() throws Exception {
		doThrow(new ResourceNotFoundException("No existe el viaje con id 404")).when(viajeService).delete(404L);

		mockMvc.perform(delete("/api/viajes/404"))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("soporte: consulta el detalle del viaje activo")
	void findsTripById() throws Exception {
		when(viajeService.findById(7L)).thenReturn(response());

		mockMvc.perform(get("/api/viajes/7"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(7));
	}

	@Test
	@DisplayName("VZ-22/23 CA2: un viaje dado de baja o inexistente devuelve 404")
	void returns404WhenFindingMissingTrip() throws Exception {
		when(viajeService.findById(404L)).thenThrow(new ResourceNotFoundException("No existe el viaje con id 404"));

		mockMvc.perform(get("/api/viajes/404"))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("VZ-22: lista los viajes activos del turista, paginados")
	void listsActiveTrips() throws Exception {
		when(viajeService.findAll(eq(USUARIO), any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(response()), PageRequest.of(0, 20), 1));

		mockMvc.perform(get("/api/viajes").param("usuario", USUARIO))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(1))
				.andExpect(jsonPath("$.content[0].nombre").value("Escapada serrana"))
				.andExpect(jsonPath("$.page.totalElements").value(1));
	}

	@Test
	@DisplayName("VZ-22: sin usuario la consulta se rechaza con 400")
	void rejectsMissingUsuario() throws Exception {
		mockMvc.perform(get("/api/viajes"))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("un id no numérico se rechaza con 400 y no con 500")
	void rejectsNonNumericId() throws Exception {
		mockMvc.perform(get("/api/viajes/abc"))
				.andExpect(status().isBadRequest());
	}

	private ViajeResponse response() {
		return new ViajeResponse(7L, "Escapada serrana",
				new UbicacionResponse("Villa General Belgrano", "Córdoba", "Villa General Belgrano", -31.95, -64.55),
				35, LocalDate.parse("2026-10-20"), LocalDate.parse("2026-10-22"),
				TipoRitmo.EQUILIBRADO, List.of(InteresCategoria.CULTURA), EstadoViaje.PLANIFICADO, USUARIO);
	}
}
