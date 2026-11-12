package com.viajesazo.turismo_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordConfig {

	/**
	 * BCrypt para las contraseñas de {@code Usuario}. Se expone como {@link PasswordEncoder} para
	 * que el login futuro use el mismo bean con {@code matches} sin acoplarse al algoritmo.
	 */
	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

}
