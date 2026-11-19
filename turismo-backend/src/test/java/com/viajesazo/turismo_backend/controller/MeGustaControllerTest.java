package com.viajesazo.turismo_backend.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.viajesazo.turismo_backend.config.AppConfig;
import com.viajesazo.turismo_backend.dto.response.MeGustaResponse;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.service.MeGustaService;

@WebMvcTest(MeGustaController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(AppConfig.class)
class MeGustaControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private MeGustaService meGustaService;

	@Test
	@DisplayName("GET estado de me gusta responde 200")
	void getEstado() throws Exception {
		when(meGustaService.estado(7L)).thenReturn(new MeGustaResponse(true, 3L));

		mockMvc.perform(get("/api/propuestas/7/me-gusta"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.meGusta").value(true))
				.andExpect(jsonPath("$.total").value(3));

		verify(meGustaService).estado(7L);
	}

	@Test
	@DisplayName("POST me gusta responde 201")
	void postMeGusta() throws Exception {
		when(meGustaService.darMeGusta(7L)).thenReturn(new MeGustaResponse(true, 1L));

		mockMvc.perform(post("/api/propuestas/7/me-gusta"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.meGusta").value(true))
				.andExpect(jsonPath("$.total").value(1));

		verify(meGustaService).darMeGusta(7L);
	}

	@Test
	@DisplayName("DELETE me gusta responde 204")
	void deleteMeGusta() throws Exception {
		when(meGustaService.quitarMeGusta(7L)).thenReturn(new MeGustaResponse(false, 0L));

		mockMvc.perform(delete("/api/propuestas/7/me-gusta"))
				.andExpect(status().isNoContent());

		verify(meGustaService).quitarMeGusta(7L);
	}

	@Test
	@DisplayName("POST me gusta sobre propuesta inexistente responde 404")
	void postNotFound() throws Exception {
		when(meGustaService.darMeGusta(999L))
				.thenThrow(new ResourceNotFoundException("No existe la propuesta con id 999"));

		mockMvc.perform(post("/api/propuestas/999/me-gusta"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("No existe la propuesta con id 999"));
	}

	@Test
	@DisplayName("POST me gusta sin rol turista responde 403")
	void postForbidden() throws Exception {
		when(meGustaService.darMeGusta(7L))
				.thenThrow(new AccessDeniedException("solo un turista puede dar me gusta"));

		mockMvc.perform(post("/api/propuestas/7/me-gusta"))
				.andExpect(status().isForbidden());
	}
}
