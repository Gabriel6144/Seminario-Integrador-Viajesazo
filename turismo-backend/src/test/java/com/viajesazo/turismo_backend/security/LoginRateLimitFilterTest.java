package com.viajesazo.turismo_backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class LoginRateLimitFilterTest {

	private LoginRateLimitFilter filter;

	@BeforeEach
	void setUp() {
		filter = new LoginRateLimitFilter(Clock.fixed(Instant.parse("2026-11-16T12:00:00Z"), ZoneOffset.UTC));
	}

	@Test
	@DisplayName("bloquea tras demasiados intentos fallidos de login")
	void blocksAfterMaxFailures() throws Exception {
		MockHttpServletRequest request = loginRequest();
		for (int i = 0; i < LoginRateLimitFilter.MAX_FAILURES; i++) {
			MockHttpServletResponse response = new MockHttpServletResponse();
			response.setStatus(400);
			filter.doFilter(request, response, new MockFilterChain());
		}

		MockHttpServletResponse blocked = new MockHttpServletResponse();
		MockFilterChain chain = mock(MockFilterChain.class);
		filter.doFilter(request, blocked, chain);

		assertThat(blocked.getStatus()).isEqualTo(429);
		assertThat(blocked.getContentAsString()).contains("demasiados intentos");
		verifyNoInteractions(chain);
	}

	@Test
	@DisplayName("un login exitoso limpia el contador de fallos")
	void successClearsFailures() throws Exception {
		MockHttpServletRequest request = loginRequest();
		for (int i = 0; i < 5; i++) {
			MockHttpServletResponse fail = new MockHttpServletResponse();
			fail.setStatus(400);
			filter.doFilter(request, fail, new MockFilterChain());
		}

		MockHttpServletResponse success = new MockHttpServletResponse();
		success.setStatus(200);
		filter.doFilter(request, success, new MockFilterChain());

		for (int i = 0; i < LoginRateLimitFilter.MAX_FAILURES - 1; i++) {
			MockHttpServletResponse fail = new MockHttpServletResponse();
			fail.setStatus(400);
			filter.doFilter(request, fail, new MockFilterChain());
		}

		MockHttpServletResponse stillAllowed = new MockHttpServletResponse();
		MockFilterChain chain = mock(MockFilterChain.class);
		filter.doFilter(request, stillAllowed, chain);
		verify(chain).doFilter(request, stillAllowed);
	}

	private static MockHttpServletRequest loginRequest() {
		MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
		request.setRemoteAddr("203.0.113.10");
		return request;
	}
}
