package com.viajesazo.turismo_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;

@Configuration
public class GeocodingConfig {

	/**
	 * Cliente HTTP contra Nominatim (OpenStreetMap). Se construye a partir del
	 * {@link RestClient.Builder} que autoconfigura Spring Boot para reusar los converters (y así
	 * el Jackson del contexto, que no falla ante propiedades desconocidas de la respuesta).
	 *
	 * <p>Nominatim exige un {@code User-Agent} identificable; sin él responde 403. No usa API key.
	 */
	@Bean
	public RestClient nominatimRestClient(
			RestClient.Builder builder,
			@Value("${geocoding.nominatim.base-url}") String baseUrl,
			@Value("${geocoding.nominatim.user-agent}") String userAgent) {
		return builder
				.baseUrl(baseUrl)
				.defaultHeader(HttpHeaders.USER_AGENT, userAgent)
				.build();
	}

}
