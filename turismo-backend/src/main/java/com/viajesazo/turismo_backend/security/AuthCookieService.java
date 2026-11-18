package com.viajesazo.turismo_backend.security;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class AuthCookieService {

	public static final String REFRESH_COOKIE_NAME = "refresh_token";
	private static final String COOKIE_PATH = "/api/auth";

	private final boolean cookieSecure;
	private final long refreshTokenDays;

	public AuthCookieService(
			@Value("${app.jwt.cookie-secure}") boolean cookieSecure,
			@Value("${app.jwt.refresh-token-days}") long refreshTokenDays) {
		this.cookieSecure = cookieSecure;
		this.refreshTokenDays = refreshTokenDays;
	}

	public ResponseCookie createRefreshCookie(String rawToken) {
		return ResponseCookie.from(REFRESH_COOKIE_NAME, rawToken)
				.httpOnly(true)
				.secure(cookieSecure)
				.sameSite("Lax")
				.path(COOKIE_PATH)
				.maxAge(Duration.ofDays(refreshTokenDays))
				.build();
	}

	public ResponseCookie clearRefreshCookie() {
		return ResponseCookie.from(REFRESH_COOKIE_NAME, "")
				.httpOnly(true)
				.secure(cookieSecure)
				.sameSite("Lax")
				.path(COOKIE_PATH)
				.maxAge(Duration.ZERO)
				.build();
	}

}
