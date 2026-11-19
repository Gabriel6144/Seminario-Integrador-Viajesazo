package com.viajesazo.turismo_backend.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

	private final Clock clock;

	public JsonAuthenticationEntryPoint(Clock clock) {
		this.clock = clock;
	}

	@Override
	public void commence(HttpServletRequest request, HttpServletResponse response,
			AuthenticationException authException) throws IOException {
		writeJsonError(response, HttpStatus.UNAUTHORIZED,
				"tenés que iniciar sesión para acceder a este recurso", clock);
	}

	static void writeJsonError(HttpServletResponse response, HttpStatus status, String message, Clock clock)
			throws IOException {
		String timestamp = LocalDateTime.now(clock).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
		String body = "{\"status\":" + status.value()
				+ ",\"error\":\"" + status.getReasonPhrase()
				+ "\",\"message\":\"" + escapeJson(message)
				+ "\",\"timestamp\":\"" + timestamp + "\"}";
		response.setStatus(status.value());
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.getWriter().write(body);
	}

	private static String escapeJson(String value) {
		return value.replace("\\", "\\\\").replace("\"", "\\\"");
	}

}
