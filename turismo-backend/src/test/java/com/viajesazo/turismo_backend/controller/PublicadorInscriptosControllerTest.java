package com.viajesazo.turismo_backend.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.viajesazo.turismo_backend.config.AppConfig;
import com.viajesazo.turismo_backend.dto.response.PropuestaInscriptosResponse;
import com.viajesazo.turismo_backend.service.InscriptosService;
import com.viajesazo.turismo_backend.service.PublicadorAgendaService;

@WebMvcTest(PublicadorInscriptosController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(AppConfig.class)
class PublicadorInscriptosControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private InscriptosService inscriptosService;

	@MockitoBean
	private PublicadorAgendaService publicadorAgendaService;

	@Test
	@DisplayName("GET /api/publicador/inscriptos responde la lista")
	void returnsInscriptos() throws Exception {
		when(inscriptosService.listarPropias()).thenReturn(List.of(
				new PropuestaInscriptosResponse(1L, "Festival", "EVENTO", 4L)));

		mockMvc.perform(get("/api/publicador/inscriptos"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].propuestaId").value(1))
				.andExpect(jsonPath("$[0].inscriptos").value(4));
	}

}
