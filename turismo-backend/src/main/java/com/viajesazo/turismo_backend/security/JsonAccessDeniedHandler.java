package com.viajesazo.turismo_backend.security;

import java.io.IOException;
import java.time.Clock;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class JsonAccessDeniedHandler implements AccessDeniedHandler {

	private final Clock clock;

	public JsonAccessDeniedHandler(Clock clock) {
		this.clock = clock;
	}

	@Override
	public void handle(HttpServletRequest request, HttpServletResponse response,
			AccessDeniedException accessDeniedException) throws IOException {
		JsonAuthenticationEntryPoint.writeJsonError(response, HttpStatus.FORBIDDEN,
				"no tenés permisos para realizar esta acción", clock);
	}

}
