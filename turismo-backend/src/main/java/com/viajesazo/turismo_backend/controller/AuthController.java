package com.viajesazo.turismo_backend.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.viajesazo.turismo_backend.dto.request.ForgotPasswordRequest;
import com.viajesazo.turismo_backend.dto.request.LoginRequest;
import com.viajesazo.turismo_backend.dto.response.AuthTokenResponse;
import com.viajesazo.turismo_backend.dto.response.UsuarioResponse;
import com.viajesazo.turismo_backend.security.AuthCookieService;
import com.viajesazo.turismo_backend.service.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;
	private final AuthCookieService authCookieService;

	@PostMapping("/login")
	public ResponseEntity<AuthTokenResponse> login(@Valid @RequestBody LoginRequest request,
			HttpServletRequest httpRequest) {
		AuthService.AuthLoginResult result = authService.login(request, httpRequest.getHeader("User-Agent"),
				httpRequest.getRemoteAddr());
		ResponseCookie cookie = authCookieService.createRefreshCookie(result.refreshTokenRaw());
		return ResponseEntity.ok()
				.header(HttpHeaders.SET_COOKIE, cookie.toString())
				.body(result.body());
	}

	@PostMapping("/refresh")
	public ResponseEntity<AuthTokenResponse> refresh(
			@CookieValue(name = AuthCookieService.REFRESH_COOKIE_NAME, required = false) String refreshToken,
			HttpServletRequest httpRequest) {
		AuthService.AuthLoginResult result = authService.refresh(refreshToken, httpRequest.getHeader("User-Agent"),
				httpRequest.getRemoteAddr());
		ResponseCookie cookie = authCookieService.createRefreshCookie(result.refreshTokenRaw());
		return ResponseEntity.ok()
				.header(HttpHeaders.SET_COOKIE, cookie.toString())
				.body(result.body());
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout(
			@CookieValue(name = AuthCookieService.REFRESH_COOKIE_NAME, required = false) String refreshToken) {
		authService.logout(refreshToken);
		ResponseCookie cookie = authCookieService.clearRefreshCookie();
		return ResponseEntity.noContent()
				.header(HttpHeaders.SET_COOKIE, cookie.toString())
				.build();
	}

	@GetMapping("/me")
	public UsuarioResponse me() {
		return authService.me();
	}

	/**
	 * Recuperación de contraseña. Responde 204 siempre (si el body es válido) para no
	 * enumerar emails. El envío de mail real aún no está configurado.
	 */
	@PostMapping("/forgot-password")
	public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
		authService.forgotPassword(request);
		return ResponseEntity.noContent().build();
	}

}
