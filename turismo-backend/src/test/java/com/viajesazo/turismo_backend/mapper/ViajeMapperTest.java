package com.viajesazo.turismo_backend.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.viajesazo.turismo_backend.dto.request.UbicacionRequest;
import com.viajesazo.turismo_backend.dto.request.ViajeRequest;
import com.viajesazo.turismo_backend.dto.response.ViajeResponse;
import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.model.Viaje;

class ViajeMapperTest {

	private final ViajeMapper mapper = new ViajeMapperImpl();

	@Test
	@DisplayName("mapea el request al viaje y convierte las fechas LocalDate a LocalDateTime")
	void mapsRequestToEntity() {
		Viaje viaje = mapper.toEntity(request());

		assertThat(viaje.getNombre()).isEqualTo("Escapada serrana");
		assertThat(viaje.getRangoInteresKm()).isEqualTo(35);
		assertThat(viaje.getRitmo()).isEqualTo(TipoRitmo.EQUILIBRADO);
		assertThat(viaje.getUsuario()).isEqualTo("turista@test.com");
		assertThat(viaje.getInteresesCategoria()).containsExactly(InteresCategoria.CULTURA);
		assertThat(viaje.getFechaInicio()).isEqualTo(LocalDateTime.parse("2026-10-20T00:00:00"));
		assertThat(viaje.getFechaFin()).isEqualTo(LocalDateTime.parse("2026-10-22T00:00:00"));
		assertThat(viaje.getZonaInteres().getCiudad()).isEqualTo("Villa General Belgrano");
	}

	@Test
	@DisplayName("mapea el viaje al response y convierte las fechas LocalDateTime a LocalDate")
	void mapsEntityToResponse() {
		Viaje viaje = mapper.toEntity(request());
		viaje.setId(7L);
		viaje.setEstado(EstadoViaje.PLANIFICADO);

		ViajeResponse response = mapper.toResponse(viaje);

		assertThat(response.id()).isEqualTo(7L);
		assertThat(response.estado()).isEqualTo(EstadoViaje.PLANIFICADO);
		assertThat(response.fechaInicio()).isEqualTo(LocalDate.parse("2026-10-20"));
		assertThat(response.fechaFin()).isEqualTo(LocalDate.parse("2026-10-22"));
		assertThat(response.ubicacion().ciudad()).isEqualTo("Villa General Belgrano");
		assertThat(response.ubicacion().nombre()).isEqualTo("Villa General Belgrano");
	}

	@Test
	@DisplayName("actualiza la ubicación en sitio sin reemplazar la instancia")
	void updatesUbicacionInPlace() {
		Viaje viaje = mapper.toEntity(request());
		Ubicacion ubicacion = viaje.getZonaInteres();

		mapper.updateUbicacion(new UbicacionRequest(new BigDecimal("-31.42"),
				new BigDecimal("-64.18"), "Ciudad de Córdoba", "Córdoba"), ubicacion);

		assertThat(ubicacion).isSameAs(viaje.getZonaInteres());
		assertThat(ubicacion.getCiudad()).isEqualTo("Ciudad de Córdoba");
		assertThat(ubicacion.getLongitud()).isEqualByComparingTo(new BigDecimal("-64.18"));
	}

	@Test
	@DisplayName("convierte fechas nulas sin explotar")
	void mapsNullDates() {
		assertThat(mapper.toLocalDateTime(null)).isNull();
		assertThat(mapper.toLocalDate(null)).isNull();
	}

	private ViajeRequest request() {
		return new ViajeRequest("Escapada serrana", ubicacion(), 35,
				LocalDate.parse("2026-10-20"), LocalDate.parse("2026-10-22"),
				TipoRitmo.EQUILIBRADO, List.of(InteresCategoria.CULTURA), "turista@test.com");
	}

	private UbicacionRequest ubicacion() {
		return new UbicacionRequest(new BigDecimal("-31.95"), new BigDecimal("-64.55"),
				"Villa General Belgrano", "Córdoba");
	}
}
