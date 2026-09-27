package com.viajesazo.turismo_backend.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppConfig {

	/**
	 * Inyectar el reloj como bean permite testear la semana ISO con una fecha fija,
	 * sin depender de la fecha en la que se ejecuta el test.
	 */
	@Bean
	public Clock clock() {
		return Clock.systemDefaultZone();
	}

}
