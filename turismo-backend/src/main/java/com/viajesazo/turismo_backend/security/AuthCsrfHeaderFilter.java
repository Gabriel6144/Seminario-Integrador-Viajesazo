package com.viajesazo.turismo_backend.security;

import java.io.IOException;
import java.time.Clock;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Defensa CSRF liviana para endpoints que dependen de la cookie refresh:
 * exige un header custom que los formularios cross-site clásicos no envían.
 */
public class AuthCsrfHeaderFilter extends OncePerRequestFilter {

	public static final String HEADER_NAME = "X-Viajesazo-CSRF";
	public static final String HEADER_VALUE = "1";

	private final Clock clock;

	public AuthCsrfHeaderFilter(Clock clock) {
		this.clock = clock;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		if (!HttpMethod.POST.matches(request.getMethod())) {
			return true;
		}
		String path = request.getRequestURI();
		return !("/api/auth/refresh".equals(path) || "/api/auth/logout".equals(path));
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		String header = request.getHeader(HEADER_NAME);
		if (!HEADER_VALUE.equals(header)) {
			JsonAuthenticationEntryPoint.writeJsonError(response, HttpStatus.FORBIDDEN,
					"falta el header de protección CSRF", clock);
			return;
		}
		filterChain.doFilter(request, response);
	}
}
