package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.viajesazo.turismo_backend.dto.response.PropuestaInscriptosResponse;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.repository.CircuitoItemRepository;
import com.viajesazo.turismo_backend.repository.PropuestaRepository;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.security.TestSecuritySupport;

@ExtendWith(MockitoExtension.class)
class InscriptosServiceTest {

	@Mock
	private UsuarioRepository usuarioRepository;

	@Mock
	private PropuestaRepository propuestaRepository;

	@Mock
	private CircuitoItemRepository circuitoItemRepository;

	@InjectMocks
	private InscriptosService service;

	@AfterEach
	void tearDown() {
		TestSecuritySupport.clear();
	}

	@Test
	@DisplayName("lista propuestas del publicador con conteo de inscriptos ordenado")
	void listsOwnPropuestasWithCounts() {
		Publicador publicador = Publicador.builder().id(10L).nombre("Turismo Córdoba").build();
		Usuario usuario = Usuario.builder()
				.id(2L)
				.nombre("Publicador")
				.email("publicador@test.com")
				.contrasena("hash")
				.activo(true)
				.roles(Set.of(Rol.PUBLICADOR))
				.publicador(publicador)
				.build();
		TestSecuritySupport.authenticate(usuario, 10L, Rol.PUBLICADOR);

		Evento p1 = Evento.builder().id(1L).nombre("Festival").publicador(publicador).build();
		Evento p2 = Evento.builder().id(2L).nombre("Feria").publicador(publicador).build();

		when(usuarioRepository.findByIdAndActivoTrue(2L)).thenReturn(Optional.of(usuario));
		when(propuestaRepository.findByPublicadorIdOrderByNombreAsc(10L)).thenReturn(List.of(p2, p1));
		when(circuitoItemRepository.countInscriptosByPropuestaId(1L)).thenReturn(5L);
		when(circuitoItemRepository.countInscriptosByPropuestaId(2L)).thenReturn(2L);

		List<PropuestaInscriptosResponse> result = service.listarPropias();

		assertThat(result).hasSize(2);
		assertThat(result.get(0).propuestaId()).isEqualTo(1L);
		assertThat(result.get(0).inscriptos()).isEqualTo(5L);
		assertThat(result.get(1).propuestaId()).isEqualTo(2L);
		assertThat(result.get(1).inscriptos()).isEqualTo(2L);
	}

}
