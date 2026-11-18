package com.viajesazo.turismo_backend.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;

import com.viajesazo.turismo_backend.security.AuthCsrfHeaderFilter;
import com.viajesazo.turismo_backend.security.JsonAccessDeniedHandler;
import com.viajesazo.turismo_backend.security.JsonAuthenticationEntryPoint;
import com.viajesazo.turismo_backend.security.JwtAuthenticationFilter;
import com.viajesazo.turismo_backend.security.JwtService;
import com.viajesazo.turismo_backend.security.LoginRateLimitFilter;
import com.viajesazo.turismo_backend.security.UsuarioUserDetailsService;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

	private final JwtService jwtService;
	private final UsuarioUserDetailsService userDetailsService;
	private final Clock clock;

	@Bean
	JwtAuthenticationFilter jwtAuthenticationFilter() {
		return new JwtAuthenticationFilter(jwtService, userDetailsService);
	}

	@Bean
	LoginRateLimitFilter loginRateLimitFilter() {
		return new LoginRateLimitFilter(clock);
	}

	@Bean
	AuthCsrfHeaderFilter authCsrfHeaderFilter() {
		return new AuthCsrfHeaderFilter(clock);
	}

	@Bean
	JsonAuthenticationEntryPoint jsonAuthenticationEntryPoint() {
		return new JsonAuthenticationEntryPoint(clock);
	}

	@Bean
	JsonAccessDeniedHandler jsonAccessDeniedHandler() {
		return new JsonAccessDeniedHandler(clock);
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http,
			JwtAuthenticationFilter jwtAuthenticationFilter,
			LoginRateLimitFilter loginRateLimitFilter,
			AuthCsrfHeaderFilter authCsrfHeaderFilter,
			JsonAuthenticationEntryPoint authenticationEntryPoint,
			JsonAccessDeniedHandler accessDeniedHandler) throws Exception {
		http
				.csrf(csrf -> csrf.disable())
				.cors(Customizer.withDefaults())
				.headers(headers -> headers
						.contentTypeOptions(Customizer.withDefaults())
						.frameOptions(frame -> frame.sameOrigin())
						.xssProtection(xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK)))
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.exceptionHandling(ex -> ex
						.authenticationEntryPoint(authenticationEntryPoint)
						.accessDeniedHandler(accessDeniedHandler))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(HttpMethod.POST, "/api/usuarios").permitAll()
						.requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/refresh",
								"/api/auth/logout", "/api/auth/forgot-password").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/eventos/*/reprogramar/preview")
						.hasAnyRole("PUBLICADOR", "ADMINISTRADOR")
						.requestMatchers(HttpMethod.GET, "/api/propuestas/*/me-gusta").authenticated()
						.requestMatchers(HttpMethod.POST, "/api/propuestas/*/me-gusta").hasRole("TURISTA")
						.requestMatchers(HttpMethod.DELETE, "/api/propuestas/*/me-gusta").hasRole("TURISTA")
						.requestMatchers(HttpMethod.GET, "/api/eventos", "/api/eventos/**").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/actividades", "/api/actividades/**").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/propuestas", "/api/propuestas/**").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/agenda", "/api/agenda/**").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/publicadores", "/api/publicadores/**")
						.access(new WebExpressionAuthorizationManager(
								"isAnonymous() or hasRole('TURISTA')"))
						.requestMatchers(HttpMethod.GET, "/api/archivos/**").permitAll()
						.requestMatchers(HttpMethod.POST, "/api/eventos", "/api/actividades", "/api/imagenes")
						.hasAnyRole("PUBLICADOR", "ADMINISTRADOR")
						.requestMatchers(HttpMethod.PUT, "/api/eventos/**", "/api/actividades/**")
						.hasAnyRole("PUBLICADOR", "ADMINISTRADOR")
						.requestMatchers(HttpMethod.PATCH, "/api/eventos/**", "/api/actividades/**")
						.hasAnyRole("PUBLICADOR", "ADMINISTRADOR")
						.requestMatchers(HttpMethod.DELETE, "/api/eventos/**", "/api/actividades/**",
								"/api/imagenes/**")
						.hasAnyRole("PUBLICADOR", "ADMINISTRADOR")
						.requestMatchers(HttpMethod.POST, "/api/publicadores").hasRole("ADMINISTRADOR")
						.requestMatchers(HttpMethod.PUT, "/api/usuarios/*/roles", "/api/usuarios/*/publicador")
						.hasRole("ADMINISTRADOR")
						.requestMatchers(HttpMethod.GET, "/api/usuarios").hasRole("ADMINISTRADOR")
						.requestMatchers("/api/admin/**").hasRole("ADMINISTRADOR")
						.requestMatchers("/api/publicador/**").hasRole("PUBLICADOR")
						.requestMatchers("/api/notificaciones", "/api/notificaciones/**").authenticated()
						.requestMatchers("/api/auth/me").authenticated()
						.requestMatchers("/api/viajes/**").authenticated()
						.anyRequest().authenticated())
				.addFilterBefore(authCsrfHeaderFilter, UsernamePasswordAuthenticationFilter.class)
				.addFilterBefore(loginRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
				.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
		return http.build();
	}

}
