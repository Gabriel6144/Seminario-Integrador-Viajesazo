package com.viajesazo.turismo_backend.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
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
import com.viajesazo.turismo_backend.dto.response.NotificacionResponse;
import com.viajesazo.turismo_backend.service.NotificacionService;

@WebMvcTest(NotificacionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(AppConfig.class)
class NotificacionControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private NotificacionService notificacionService;

	@Test
	@DisplayName("lista las notificaciones propias")
	void listsOwn() throws Exception {
		when(notificacionService.listarMias()).thenReturn(List.of(
				new NotificacionResponse(
						1L,
						"Evento reprogramado: Festival",
						"El evento «Festival» fue reprogramado del 1/10/2026 al 1/12/2026.",
						false,
						Instant.parse("2026-11-15T12:00:00Z"),
						7L,
						"EVENTO_REPROGRAMADO")));

		mockMvc.perform(get("/api/notificaciones"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].titulo").value("Evento reprogramado: Festival"))
				.andExpect(jsonPath("$[0].leida").value(false));

		verify(notificacionService).listarMias();
	}

	@Test
	@DisplayName("marcar leída responde 200")
	void marksRead() throws Exception {
		when(notificacionService.marcarLeida(1L)).thenReturn(new NotificacionResponse(
				1L,
				"Evento reprogramado: Festival",
				"cuerpo",
				true,
				Instant.parse("2026-11-15T12:00:00Z"),
				7L,
				"EVENTO_REPROGRAMADO"));

		mockMvc.perform(patch("/api/notificaciones/1/leida"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.leida").value(true));

		verify(notificacionService).marcarLeida(1L);
	}
}
