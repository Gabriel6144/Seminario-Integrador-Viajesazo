package com.viajesazo.turismo_backend.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Resuelve una dirección a coordenadas usando Nominatim (OpenStreetMap), sin API key.
 *
 * <p>Es deliberadamente tolerante: ante una respuesta vacía o un error de red devuelve
 * {@link Optional#empty()}. Decidir si eso es un error de negocio (rechazar el alta) es
 * responsabilidad de quien lo invoca, no de este servicio.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeocodingService {

	private final RestClient nominatimRestClient;

	/** Coordenadas geográficas resueltas para una ubicación. */
	public record Coordenadas(BigDecimal latitud, BigDecimal longitud) {}

	public Optional<Coordenadas> geocode(String lugarRecinto, String localidad, String direccion) {
		String query = buildQuery(lugarRecinto, localidad, direccion);
		try {
			NominatimPlace[] results = nominatimRestClient.get()
					.uri(uriBuilder -> uriBuilder.path("/search")
							.queryParam("q", query)
							.queryParam("format", "json")
							.queryParam("limit", 1)
							.queryParam("countrycodes", "ar")
							.build())
					.retrieve()
					.body(NominatimPlace[].class);

			if (results == null || results.length == 0) {
				log.debug("Nominatim no encontró la ubicación para '{}'", query);
				return Optional.empty();
			}
			NominatimPlace place = results[0];
			return Optional.of(new Coordenadas(new BigDecimal(place.lat()), new BigDecimal(place.lon())));
		} catch (RestClientException | NumberFormatException ex) {
			log.warn("Falló la geocodificación de '{}': {}", query, ex.getMessage());
			return Optional.empty();
		}
	}

	/**
	 * Arma la query del buscador free-form de Nominatim (más específico primero, provincia y país
	 * al final).
	 *
	 * <p>Descarta las partes vacías y las que se repiten: el cliente suele mandar la misma
	 * localidad en {@code lugarRecinto}, {@code localidad} y {@code direccion}, y una query con
	 * el término repetido (o con un {@code display_name} entero dentro de un campo) hace que
	 * Nominatim no devuelva nada. Un campo se considera repetido si contiene a uno ya incluido o
	 * está contenido en él (sin distinguir mayúsculas): así el {@code display_name} completo que
	 * el cliente llegue a mandar en {@code direccion} se descarta frente a la localidad.
	 */
	static String buildQuery(String lugarRecinto, String localidad, String direccion) {
		List<String> partes = new ArrayList<>();
		for (String candidate : new String[] { lugarRecinto, direccion, localidad, "Córdoba", "Argentina" }) {
			String parte = candidate == null ? "" : candidate.trim();
			if (parte.isEmpty()) {
				continue;
			}
			String normalizada = parte.toLowerCase(Locale.ROOT);
			boolean repetida = partes.stream()
					.map(ya -> ya.toLowerCase(Locale.ROOT))
					.anyMatch(ya -> ya.contains(normalizada) || normalizada.contains(ya));
			if (!repetida) {
				partes.add(parte);
			}
		}
		return String.join(", ", partes);
	}

	/** Subconjunto de la respuesta de Nominatim: solo interesan las coordenadas. */
	private record NominatimPlace(String lat, String lon) {}

}
