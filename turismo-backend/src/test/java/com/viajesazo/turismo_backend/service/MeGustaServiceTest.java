package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.viajesazo.turismo_backend.dto.response.MeGustaResponse;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.MeGusta;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.repository.MeGustaRepository;
import com.viajesazo.turismo_backend.repository.PropuestaRepository;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.security.UsuarioPrincipal;

@ExtendWith(MockitoExtension.class)
class MeGustaServiceTest {

	@Mock
	private MeGustaRepository meGustaRepository;
	@Mock
	private PropuestaRepository propuestaRepository;
	@Mock
	private UsuarioRepository usuarioRepository;

	@InjectMocks
	private MeGustaService service;

	@AfterEach
	void clearSecurity() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("turista da me gusta y queda persistido")
	void turistaDaMeGusta() {
		setPrincipal(1L, Rol.TURISTA);
		Evento propuesta = new Evento();
		propuesta.setId(7L);
		Usuario usuario = Usuario.builder().id(1L).activo(true).build();

		when(propuestaRepository.findById(7L)).thenReturn(Optional.of(propuesta));
		when(meGustaRepository.existsByUsuarioIdAndPropuestaId(1L, 7L)).thenReturn(false);
		when(usuarioRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(usuario));
		when(meGustaRepository.countByPropuestaId(7L)).thenReturn(1L);

		MeGustaResponse result = service.darMeGusta(7L);

		assertThat(result.meGusta()).isTrue();
		assertThat(result.total()).isEqualTo(1L);
		verify(meGustaRepository).save(any(MeGusta.class));
	}

	@Test
	@DisplayName("dar me gusta es idempotente si ya existe")
	void darMeGustaIdempotente() {
		setPrincipal(1L, Rol.TURISTA);
		Evento propuesta = new Evento();
		propuesta.setId(7L);
		when(propuestaRepository.findById(7L)).thenReturn(Optional.of(propuesta));
		when(meGustaRepository.existsByUsuarioIdAndPropuestaId(1L, 7L)).thenReturn(true);
		when(meGustaRepository.countByPropuestaId(7L)).thenReturn(2L);

		MeGustaResponse result = service.darMeGusta(7L);

		assertThat(result.meGusta()).isTrue();
		assertThat(result.total()).isEqualTo(2L);
		verify(meGustaRepository, never()).save(any());
	}

	@Test
	@DisplayName("publicador no puede dar me gusta")
	void publicadorForbidden() {
		setPrincipal(2L, Rol.PUBLICADOR);
		assertThatThrownBy(() -> service.darMeGusta(7L))
				.isInstanceOf(AccessDeniedException.class)
				.hasMessageContaining("turista");
	}

	@Test
	@DisplayName("propuesta inexistente responde not found")
	void propuestaInexistente() {
		setPrincipal(1L, Rol.TURISTA);
		when(propuestaRepository.findById(999L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.darMeGusta(999L))
				.isInstanceOf(ResourceNotFoundException.class);
	}

	@Test
	@DisplayName("quitar me gusta deja meGusta=false")
	void quitarMeGusta() {
		setPrincipal(1L, Rol.TURISTA);
		Evento propuesta = new Evento();
		propuesta.setId(7L);
		when(propuestaRepository.findById(7L)).thenReturn(Optional.of(propuesta));
		when(meGustaRepository.countByPropuestaId(7L)).thenReturn(0L);

		MeGustaResponse result = service.quitarMeGusta(7L);

		assertThat(result.meGusta()).isFalse();
		verify(meGustaRepository).deleteByUsuarioIdAndPropuestaId(1L, 7L);
	}

	private void setPrincipal(Long id, Rol rol) {
		UsuarioPrincipal principal = UsuarioPrincipal.builder()
				.id(id)
				.email("user@test.com")
				.password("x")
				.authorities(Set.of(new SimpleGrantedAuthority("ROLE_" + rol.name())))
				.activo(true)
				.build();
		SecurityContextHolder.getContext().setAuthentication(
				new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
	}
}
