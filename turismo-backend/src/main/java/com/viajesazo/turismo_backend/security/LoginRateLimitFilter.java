package com.viajesazo.turismo_backend.security;

import java.io.IOException;
import java.time.Clock;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Limita intentos fallidos de {@code POST /api/auth/login} por IP (ventana fija en memoria).
 * Respuesta genérica 429: no revela si el email existe.
 */
public class LoginRateLimitFilter extends OncePerRequestFilter {

	public static final int MAX_FAILURES = 10;
	public static final long WINDOW_MILLIS = 15 * 60 * 1000L;

	private final Clock clock;
	private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

	public LoginRateLimitFilter(Clock clock) {
		this.clock = clock;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		return !(HttpMethod.POST.matches(request.getMethod())
				&& "/api/auth/login".equals(request.getRequestURI()));
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		String ip = clientIp(request);
		purgeExpired();
		Window window = windows.computeIfAbsent(ip, ignored -> new Window(clock.millis()));
		if (window.isExpired(clock.millis())) {
			window = new Window(clock.millis());
			windows.put(ip, window);
		}
		if (window.failures.get() >= MAX_FAILURES) {
			JsonAuthenticationEntryPoint.writeJsonError(response, HttpStatus.TOO_MANY_REQUESTS,
					"demasiados intentos de inicio de sesión; probá más tarde", clock);
			return;
		}

		filterChain.doFilter(request, response);

		int status = response.getStatus();
		if (status >= 200 && status < 300) {
			windows.remove(ip);
		} else if (status >= 400) {
			window.failures.incrementAndGet();
		}
	}

	private void purgeExpired() {
		long now = clock.millis();
		Iterator<Map.Entry<String, Window>> it = windows.entrySet().iterator();
		while (it.hasNext()) {
			Map.Entry<String, Window> entry = it.next();
			if (entry.getValue().isExpired(now)) {
				it.remove();
			}
		}
	}

	static String clientIp(HttpServletRequest request) {
		String forwarded = request.getHeader("X-Forwarded-For");
		if (forwarded != null && !forwarded.isBlank()) {
			return forwarded.split(",")[0].trim();
		}
		String remote = request.getRemoteAddr();
		return remote == null ? "unknown" : remote;
	}

	private static final class Window {
		private final long startedAtMillis;
		private final AtomicInteger failures = new AtomicInteger(0);

		private Window(long startedAtMillis) {
			this.startedAtMillis = startedAtMillis;
		}

		private boolean isExpired(long now) {
			return now - startedAtMillis >= WINDOW_MILLIS;
		}
	}
}
