package com.viajesazo.turismo_backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.viajesazo.turismo_backend.config.AppConfig;
import com.viajesazo.turismo_backend.dto.request.LoginRequest;
import com.viajesazo.turismo_backend.dto.response.AuthTokenResponse;
import com.viajesazo.turismo_backend.dto.response.UsuarioResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.security.AuthCookieService;
import com.viajesazo.turismo_backend.service.AuthService;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({AppConfig.class, AuthCookieService.class})
class AuthControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private AuthService authService;

	@Test
	@DisplayName("login responde 200 con access token y Set-Cookie de refresh")
	void loginSetsCookie() throws Exception {
		UsuarioResponse usuario = new UsuarioResponse(1L, "Turista", "turista@test.com", null,
				Set.of(Rol.TURISTA), null);
		when(authService.login(any(LoginRequest.class), any(), any()))
				.thenReturn(new AuthService.AuthLoginResult(
						new AuthTokenResponse("jwt", "Bearer", 900, usuario), "refresh-raw"));

		mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{ "email": "turista@test.com", "contrasena": "Turista123!" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.accessToken").value("jwt"))
				.andExpect(jsonPath("$.tokenType").value("Bearer"))
				.andExpect(jsonPath("$.usuario.email").value("turista@test.com"))
				.andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("refresh_token=")));
	}

	@Test
	@DisplayName("login con credenciales inválidas responde 400")
	void loginBadCredentials() throws Exception {
		when(authService.login(any(LoginRequest.class), any(), any()))
				.thenThrow(new BusinessRuleException("email o contraseña incorrectos"));

		mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{ "email": "turista@test.com", "contrasena": "mala" }
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("email o contraseña incorrectos"));
	}

	@Test
	@DisplayName("refresh rota la cookie")
	void refreshRotatesCookie() throws Exception {
		UsuarioResponse usuario = new UsuarioResponse(1L, "Turista", "turista@test.com", null,
				Set.of(Rol.TURISTA), null);
		when(authService.refresh(eq("old"), any(), any()))
				.thenReturn(new AuthService.AuthLoginResult(
						new AuthTokenResponse("jwt2", "Bearer", 900, usuario), "new-refresh"));

		mockMvc.perform(post("/api/auth/refresh").cookie(
						new jakarta.servlet.http.Cookie(AuthCookieService.REFRESH_COOKIE_NAME, "old")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.accessToken").value("jwt2"))
				.andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("refresh_token=")));
	}

	@Test
	@DisplayName("logout limpia la cookie y revoca el token")
	void logoutClearsCookie() throws Exception {
		mockMvc.perform(post("/api/auth/logout").cookie(
						new jakarta.servlet.http.Cookie(AuthCookieService.REFRESH_COOKIE_NAME, "refresh-raw")))
				.andExpect(status().isNoContent())
				.andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));

		verify(authService).logout("refresh-raw");
	}

	@Test
	@DisplayName("me devuelve el usuario autenticado")
	void meReturnsCurrentUser() throws Exception {
		when(authService.me()).thenReturn(new UsuarioResponse(1L, "Turista", "turista@test.com", null,
				Set.of(Rol.TURISTA), null));

		mockMvc.perform(get("/api/auth/me"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("turista@test.com"));
	}

	@Test
	@DisplayName("forgot-password responde 204 aunque el email no exista")
	void forgotPasswordAlwaysNoContent() throws Exception {
		mockMvc.perform(post("/api/auth/forgot-password")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{ "email": "nadie@test.com" }
								"""))
				.andExpect(status().isNoContent());

		verify(authService).forgotPassword(any());
	}

	@Test
	@DisplayName("forgot-password con email inválido responde 400")
	void forgotPasswordInvalidEmail() throws Exception {
		mockMvc.perform(post("/api/auth/forgot-password")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{ "email": "no-es-email" }
								"""))
				.andExpect(status().isBadRequest());
	}

}
