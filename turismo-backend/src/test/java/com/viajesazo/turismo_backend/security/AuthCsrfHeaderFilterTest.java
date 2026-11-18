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

class AuthCsrfHeaderFilterTest {

	private AuthCsrfHeaderFilter filter;

	@BeforeEach
	void setUp() {
		filter = new AuthCsrfHeaderFilter(Clock.fixed(Instant.parse("2026-11-16T12:00:00Z"), ZoneOffset.UTC));
	}

	@Test
	@DisplayName("refresh sin header CSRF responde 403")
	void refreshWithoutHeaderForbidden() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/refresh");
		MockHttpServletResponse response = new MockHttpServletResponse();
		MockFilterChain chain = mock(MockFilterChain.class);

		filter.doFilter(request, response, chain);

		assertThat(response.getStatus()).isEqualTo(403);
		assertThat(response.getContentAsString()).contains("CSRF");
		verifyNoInteractions(chain);
	}

	@Test
	@DisplayName("logout con header CSRF continúa la cadena")
	void logoutWithHeaderContinues() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/logout");
		request.addHeader(AuthCsrfHeaderFilter.HEADER_NAME, AuthCsrfHeaderFilter.HEADER_VALUE);
		MockHttpServletResponse response = new MockHttpServletResponse();
		MockFilterChain chain = mock(MockFilterChain.class);

		filter.doFilter(request, response, chain);

		verify(chain).doFilter(request, response);
	}

	@Test
	@DisplayName("login no exige header CSRF")
	void loginDoesNotRequireHeader() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
		MockHttpServletResponse response = new MockHttpServletResponse();
		MockFilterChain chain = mock(MockFilterChain.class);

		filter.doFilter(request, response, chain);

		verify(chain).doFilter(request, response);
	}
}
