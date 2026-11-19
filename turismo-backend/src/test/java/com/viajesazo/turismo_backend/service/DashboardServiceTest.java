package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.viajesazo.turismo_backend.dto.response.AdminDashboardResponse;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.repository.CircuitoItemRepository;
import com.viajesazo.turismo_backend.repository.PropuestaRepository;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.repository.ViajeRepository;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

	@Mock
	private UsuarioRepository usuarioRepository;

	@Mock
	private ViajeRepository viajeRepository;

	@Mock
	private CircuitoItemRepository circuitoItemRepository;

	@Mock
	private PropuestaRepository propuestaRepository;

	@InjectMocks
	private DashboardService service;

	@Test
	@DisplayName("arma el dashboard con totales, ventanas y ranking vacío")
	void buildsDashboard() {
		when(usuarioRepository.countByActivoTrue()).thenReturn(10L);
		when(usuarioRepository.countByActivoTrueAndUltimoAccesoEnGreaterThanEqual(any(Instant.class)))
				.thenReturn(4L, 7L);
		when(usuarioRepository.countByActivoTrueAndCreadoEnGreaterThanEqual(any(Instant.class)))
				.thenReturn(2L, 5L);
		when(usuarioRepository.countActivosByRol(Rol.TURISTA)).thenReturn(8L);
		when(usuarioRepository.countActivosByRol(Rol.PUBLICADOR)).thenReturn(2L);
		when(viajeRepository.countByCreadoEnGreaterThanEqual(any(Instant.class))).thenReturn(1L, 3L);
		when(circuitoItemRepository.countInscriptosGroupedByPropuesta()).thenReturn(List.of());

		AdminDashboardResponse response = service.getDashboard();

		assertThat(response.totalUsuarios()).isEqualTo(10L);
		assertThat(response.usuariosActivos7d()).isEqualTo(4L);
		assertThat(response.usuariosActivos30d()).isEqualTo(7L);
		assertThat(response.nuevosRegistros7d()).isEqualTo(2L);
		assertThat(response.nuevosRegistros30d()).isEqualTo(5L);
		assertThat(response.totalTuristas()).isEqualTo(8L);
		assertThat(response.totalPublicadores()).isEqualTo(2L);
		assertThat(response.viajesCreados7d()).isEqualTo(1L);
		assertThat(response.viajesCreados30d()).isEqualTo(3L);
		assertThat(response.propuestasPopulares()).isEmpty();
	}

}
