package com.viajesazo.turismo_backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.viajesazo.turismo_backend.config.AppConfig;
import com.viajesazo.turismo_backend.dto.request.PropuestaFiltro;
import com.viajesazo.turismo_backend.dto.response.PropuestaResumenResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.Modalidad;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoPropuesta;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.service.PropuestaQueryService;

@WebMvcTest(PropuestaController.class)
@Import(AppConfig.class)
class PropuestaControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private PropuestaQueryService propuestaQueryService;

	@Test
	@DisplayName("US3: lista propuestas con filtros opcionales y los propaga al service")
	void listsWithFilters() throws Exception {
		when(propuestaQueryService.search(any(PropuestaFiltro.class), any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(response()), PageRequest.of(0, 20), 1));

		mockMvc.perform(get("/api/propuestas")
						.param("tipo", "EVENTO")
						.param("tipoPropuesta", "FESTIVAL")
						.param("categoria", "CULTURA")
						.param("localidad", "Cosquín")
						.param("ubicacion", "Plaza Próspero Molina")
						.param("q", "folklore")
						.param("fechaDesde", "2026-10-01")
						.param("fechaHasta", "2026-10-31")
						.param("page", "0")
						.param("size", "10"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(1))
				.andExpect(jsonPath("$.content[0].tipo").value("EVENTO"))
				.andExpect(jsonPath("$.content[0].nombre").value("Festival de Folklore"))
				.andExpect(jsonPath("$.page.totalElements").value(1));

		ArgumentCaptor<PropuestaFiltro> captor = ArgumentCaptor.forClass(PropuestaFiltro.class);
		org.mockito.Mockito.verify(propuestaQueryService).search(captor.capture(), any(Pageable.class));
		PropuestaFiltro filtro = captor.getValue();
		org.assertj.core.api.Assertions.assertThat(filtro.tipo()).isEqualTo(TipoRegistro.EVENTO);
		org.assertj.core.api.Assertions.assertThat(filtro.tipoPropuesta()).isEqualTo(TipoPropuesta.FESTIVAL);
		org.assertj.core.api.Assertions.assertThat(filtro.categoria()).isEqualTo(InteresCategoria.CULTURA);
		org.assertj.core.api.Assertions.assertThat(filtro.localidad()).isEqualTo("Cosquín");
		org.assertj.core.api.Assertions.assertThat(filtro.ubicacion()).isEqualTo("Plaza Próspero Molina");
		org.assertj.core.api.Assertions.assertThat(filtro.q()).isEqualTo("folklore");
		org.assertj.core.api.Assertions.assertThat(filtro.fechaDesde()).isEqualTo(LocalDate.parse("2026-10-01"));
		org.assertj.core.api.Assertions.assertThat(filtro.fechaHasta()).isEqualTo(LocalDate.parse("2026-10-31"));
	}

	@Test
	@DisplayName("US3: un tipo de propuesta inexistente responde 400")
	void rejectsUnknownType() throws Exception {
		mockMvc.perform(get("/api/propuestas").param("tipo", "EXCURSION"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("tipo")));
	}

	@Test
	@DisplayName("US3: un orden no permitido responde 400")
	void rejectsInvalidSort() throws Exception {
		when(propuestaQueryService.search(any(PropuestaFiltro.class), any(Pageable.class)))
				.thenThrow(new BusinessRuleException("orden no permitido: precio"));

		mockMvc.perform(get("/api/propuestas").param("sort", "precio,desc"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("precio")));
	}

	private PropuestaResumenResponse response() {
		return new PropuestaResumenResponse(7L, TipoRegistro.EVENTO, "Festival de Folklore",
				"Música y danzas", TipoPropuesta.FESTIVAL, InteresCategoria.CULTURA, Modalidad.PEDESTRE,
				TipoAcceso.GRATUITO, null, "Plaza Próspero Molina", "Cosquín", "Av. San Martín 800",
				new BigDecimal("-31.41350000"), new BigDecimal("-64.49470000"), LocalDate.parse("2026-10-01"),
				LocalDate.parse("2026-10-03"), null, null, null, List.of(), 1L, "Turismo Córdoba");
	}
}
