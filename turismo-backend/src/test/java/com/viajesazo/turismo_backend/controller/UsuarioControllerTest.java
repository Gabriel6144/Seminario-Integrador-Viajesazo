package com.viajesazo.turismo_backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.viajesazo.turismo_backend.config.AppConfig;
import com.viajesazo.turismo_backend.dto.request.UsuarioRequest;
import com.viajesazo.turismo_backend.dto.response.UsuarioResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.service.UsuarioService;

@WebMvcTest(UsuarioController.class)
// Mismo motivo que en PublicadorControllerTest: GlobalExceptionHandler necesita el Clock de AppConfig.
@Import(AppConfig.class)
class UsuarioControllerTest {

	private static final String BODY_VALIDO = """
			{ "nombre": "Ana Pérez", "email": "ana@mail.com", "telefono": "351-5551234", "contrasena": "secreta123" }
			""";

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private UsuarioService usuarioService;

	@Test
	@DisplayName("registra el usuario, responde 201 y no devuelve la contraseña")
	void createsUser() throws Exception {
		when(usuarioService.create(any(UsuarioRequest.class)))
				.thenReturn(new UsuarioResponse(1L, "Ana Pérez", "ana@mail.com", "351-5551234"));

		mockMvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON).content(BODY_VALIDO))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.email").value("ana@mail.com"))
				.andExpect(jsonPath("$.contrasena").doesNotExist());
	}

	@Test
	@DisplayName("sin nombre, email ni contraseña responde 400 y no llama al service")
	void rejectsMissingFields() throws Exception {
		mockMvc.perform(post("/api/usuarios")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isBadRequest());

		verify(usuarioService, never()).create(any(UsuarioRequest.class));
	}

	@Test
	@DisplayName("un email con formato inválido responde 400")
	void rejectsInvalidEmail() throws Exception {
		mockMvc.perform(post("/api/usuarios")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{ "nombre": "Ana Pérez", "email": "no-es-un-email", "contrasena": "secreta123" }
								"""))
				.andExpect(status().isBadRequest());

		verify(usuarioService, never()).create(any(UsuarioRequest.class));
	}

	@Test
	@DisplayName("una contraseña de menos de 8 caracteres responde 400")
	void rejectsShortPassword() throws Exception {
		mockMvc.perform(post("/api/usuarios")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{ "nombre": "Ana Pérez", "email": "ana@mail.com", "contrasena": "corta" }
								"""))
				.andExpect(status().isBadRequest());

		verify(usuarioService, never()).create(any(UsuarioRequest.class));
	}

	@Test
	@DisplayName("un email ya registrado responde 400 con el mensaje de negocio")
	void rejectsDuplicateEmail() throws Exception {
		when(usuarioService.create(any(UsuarioRequest.class)))
				.thenThrow(new BusinessRuleException("ya existe un usuario con ese email"));

		mockMvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON).content(BODY_VALIDO))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("ya existe un usuario con ese email"));
	}

	@Test
	@DisplayName("la carrera contra la constraint responde el mensaje de usuario, no el de publicador")
	void duplicateFromDatabaseUsesUserMessage() throws Exception {
		when(usuarioService.create(any(UsuarioRequest.class))).thenThrow(new DataIntegrityViolationException(
				"Unique index or primary key violation: \"PUBLIC.UK_EMAIL ON PUBLIC.USUARIO(EMAIL NULLS FIRST)\""));

		mockMvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON).content(BODY_VALIDO))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("ya existe un usuario con ese email"));
	}

	@Test
	@DisplayName("consultar un usuario inexistente responde 404")
	void notFound() throws Exception {
		when(usuarioService.findById(99L)).thenThrow(new ResourceNotFoundException("No existe el usuario con id 99"));

		mockMvc.perform(get("/api/usuarios/99")).andExpect(status().isNotFound());
	}

}
