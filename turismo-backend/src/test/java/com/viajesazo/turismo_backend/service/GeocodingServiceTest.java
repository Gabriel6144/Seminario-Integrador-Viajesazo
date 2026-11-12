package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Tests del armado de la query de Nominatim.
 *
 * <p>{@code geocode} en sí es pegamento sobre el {@code RestClient} y no se ejercita acá: lo
 * mockean los tests de servicio que lo consumen. Lo que se prueba es la lógica de dedup, que es
 * la que decide si la query es resoluble o no.
 */
class GeocodingServiceTest {

	@Test
	@DisplayName("colapsa la localidad repetida en los tres campos a una sola mención")
	void buildQueryCollapsesRepeatedLocality() {
		String query = GeocodingService.buildQuery(
				"Villa Carlos Paz", "Villa Carlos Paz", "Villa Carlos Paz");

		assertThat(query).isEqualTo("Villa Carlos Paz, Córdoba, Argentina");
	}

	@Test
	@DisplayName("descarta el display_name completo que el cliente mande en direccion")
	void buildQueryDropsFullDisplayName() {
		String query = GeocodingService.buildQuery(
				"Villa Carlos Paz",
				"Villa Carlos Paz",
				"Villa Carlos Paz, Municipio de Villa Carlos Paz, Pedanía San Roque, "
						+ "Departamento Punilla, Córdoba, X5166, Argentina");

		assertThat(query).isEqualTo("Villa Carlos Paz, Córdoba, Argentina");
	}

	@Test
	@DisplayName("conserva recinto, calle y localidad cuando los tres aportan")
	void buildQueryKeepsDistinctParts() {
		String query = GeocodingService.buildQuery(
				"Anfiteatro José Hernández", "Jesús María", "Cleto Peña");

		assertThat(query).isEqualTo(
				"Anfiteatro José Hernández, Cleto Peña, Jesús María, Córdoba, Argentina");
	}

	@Test
	@DisplayName("saltea los campos vacíos o nulos")
	void buildQuerySkipsBlankParts() {
		assertThat(GeocodingService.buildQuery("", null, "Centro"))
				.isEqualTo("Centro, Córdoba, Argentina");
	}

	@Test
	@DisplayName("no duplica la provincia si la localidad ya es Córdoba")
	void buildQueryDoesNotRepeatProvince() {
		String query = GeocodingService.buildQuery("Teatro Real", "Córdoba", "San Jerónimo 66");

		assertThat(query).isEqualTo("Teatro Real, San Jerónimo 66, Córdoba, Argentina");
	}

}
