package com.viajesazo.turismo_backend.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.viajesazo.turismo_backend.config.AppConfig;
import com.viajesazo.turismo_backend.dto.response.AdminDashboardResponse;
import com.viajesazo.turismo_backend.service.DashboardService;

@WebMvcTest(DashboardController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(AppConfig.class)
class DashboardControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private DashboardService dashboardService;

	@Test
	@DisplayName("GET /api/admin/dashboard responde métricas")
	void returnsDashboard() throws Exception {
		when(dashboardService.getDashboard()).thenReturn(new AdminDashboardResponse(
				12L, 5L, 9L, 2L, 4L, 8L, 3L, 3L, 7L, List.of()));

		mockMvc.perform(get("/api/admin/dashboard"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalUsuarios").value(12))
				.andExpect(jsonPath("$.usuariosActivos7d").value(5))
				.andExpect(jsonPath("$.viajesCreados30d").value(7));
	}

}
