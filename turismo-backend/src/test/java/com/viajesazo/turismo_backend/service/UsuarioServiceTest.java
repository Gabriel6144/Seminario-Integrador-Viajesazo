package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.viajesazo.turismo_backend.dto.request.BajaUsuarioRequest;
import com.viajesazo.turismo_backend.dto.request.UsuarioRequest;
import com.viajesazo.turismo_backend.dto.response.BajaUsuarioResponse;
import com.viajesazo.turismo_backend.dto.response.UsuarioResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ConfirmationRequiredException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.UsuarioMapperImpl;
import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.repository.ViajeRepository;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

	private static final String CONTRASENA = "secreta123";
	private static final String EMAIL = "ana@mail.com";

	@Mock
	private UsuarioRepository usuarioRepository;

	@Mock
	private ViajeRepository viajeRepository;

	// Encoder real: lo que se prueba es justamente que se guarde un hash verificable.
	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

	private UsuarioService service;

	@BeforeEach
	void setUp() {
		service = new UsuarioService(usuarioRepository, new UsuarioMapperImpl(), passwordEncoder, viajeRepository);
	}

	// --- Registro ---

	@Test
	@DisplayName("registra el usuario con sus datos y activo")
	void createsUser() {
		when(usuarioRepository.existsByEmail(EMAIL)).thenReturn(false);
		when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> {
			Usuario saved = invocation.getArgument(0);
			saved.setId(1L);
			return saved;
		});

		UsuarioResponse result = service.create(new UsuarioRequest("Ana Pérez", EMAIL, "351-5551234", CONTRASENA));

		assertThat(result.id()).isEqualTo(1L);
		assertThat(result.nombre()).isEqualTo("Ana Pérez");
		assertThat(result.email()).isEqualTo(EMAIL);
		assertThat(result.telefono()).isEqualTo("351-5551234");

		ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
		verify(usuarioRepository).save(captor.capture());
		assertThat(captor.getValue().isActivo()).isTrue();
	}

	@Test
	@DisplayName("guarda la contraseña como hash BCrypt, nunca en texto plano")
	void storesHashedPassword() {
		when(usuarioRepository.existsByEmail(EMAIL)).thenReturn(false);
		when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

		service.create(new UsuarioRequest("Ana Pérez", EMAIL, null, CONTRASENA));

		ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
		verify(usuarioRepository).save(captor.capture());
		String guardada = captor.getValue().getContrasena();
		assertThat(guardada).isNotEqualTo(CONTRASENA).startsWith("$2");
		assertThat(passwordEncoder.matches(CONTRASENA, guardada)).isTrue();
	}

	@Test
	@DisplayName("una contraseña de menos de 72 caracteres pero más de 72 bytes da 400, no 500")
	void rejectsPasswordOverBcryptByteLimit() {
		// 40 ñ = 40 caracteres (pasa @Size) pero 80 bytes en UTF-8: BCrypt lanzaría IllegalArgumentException.
		String larga = "ñ".repeat(40);

		assertThatThrownBy(() -> service.create(new UsuarioRequest("Ana Pérez", EMAIL, null, larga)))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("demasiado larga");

		verify(usuarioRepository, never()).save(any(Usuario.class));
	}

	@Test
	@DisplayName("un email ya registrado se rechaza sin llegar a escribir")
	void rejectsDuplicateEmail() {
		when(usuarioRepository.existsByEmail(EMAIL)).thenReturn(true);

		assertThatThrownBy(() -> service.create(new UsuarioRequest("Ana Pérez", EMAIL, null, CONTRASENA)))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("ya existe un usuario con ese email");

		verify(usuarioRepository, never()).save(any(Usuario.class));
	}

	// --- Consulta ---

	@Test
	@DisplayName("consulta un usuario activo")
	void findsUser() {
		when(usuarioRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(usuario()));

		assertThat(service.findById(1L).nombre()).isEqualTo("Ana Pérez");
	}

	@Test
	@DisplayName("consultar un usuario inexistente o dado de baja devuelve 404")
	void failsWhenUserNotFound() {
		when(usuarioRepository.findByIdAndActivoTrue(404L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.findById(404L))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessageContaining("404");
	}

	// --- Baja ---

	@Test
	@DisplayName("baja CA3/CA5: marca la cuenta inactiva y cancela sus viajes borrador y planificados")
	void deactivatesUserAndCancelsTrips() {
		Usuario usuario = usuario();
		Viaje borrador = viaje(EstadoViaje.BORRADOR);
		Viaje planificado = viaje(EstadoViaje.PLANIFICADO);
		when(usuarioRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(usuario));
		when(viajeRepository.findByUsuarioAndEstadoIn(eq(EMAIL), anyCollection()))
				.thenReturn(List.of(borrador, planificado));

		BajaUsuarioResponse result = service.darDeBaja(1L, new BajaUsuarioRequest(CONTRASENA), true);

		assertThat(usuario.isActivo()).isFalse();
		verify(usuarioRepository).save(usuario);
		assertThat(borrador.getEstado()).isEqualTo(EstadoViaje.CANCELADO);
		assertThat(planificado.getEstado()).isEqualTo(EstadoViaje.CANCELADO);
		verify(viajeRepository).saveAll(List.of(borrador, planificado));
		assertThat(result.id()).isEqualTo(1L);
		assertThat(result.viajesCancelados()).isEqualTo(2);
		assertThat(result.mensaje()).isEqualTo("la cuenta se dio de baja correctamente");
	}

	@Test
	@DisplayName("baja CA5: solo busca viajes BORRADOR y PLANIFICADO; EN_CURSO no se puede cancelar")
	void onlyCancelsCancellableTrips() {
		when(usuarioRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(usuario()));
		when(viajeRepository.findByUsuarioAndEstadoIn(eq(EMAIL), anyCollection())).thenReturn(List.of());

		BajaUsuarioResponse result = service.darDeBaja(1L, new BajaUsuarioRequest(CONTRASENA), true);

		@SuppressWarnings("unchecked")
		ArgumentCaptor<Collection<EstadoViaje>> captor = ArgumentCaptor.forClass(Collection.class);
		verify(viajeRepository).findByUsuarioAndEstadoIn(eq(EMAIL), captor.capture());
		assertThat(captor.getValue()).containsExactlyInAnyOrder(EstadoViaje.BORRADOR, EstadoViaje.PLANIFICADO);
		assertThat(result.viajesCancelados()).isZero();
	}

	@Test
	@DisplayName("baja CA1: sin confirmación responde 409 y no toca la cuenta")
	void requiresConfirmation() {
		Usuario usuario = usuario();
		when(usuarioRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(usuario));

		assertThatThrownBy(() -> service.darDeBaja(1L, new BajaUsuarioRequest(CONTRASENA), false))
				.isInstanceOf(ConfirmationRequiredException.class)
				.hasMessageContaining("confirmar=true");

		assertThat(usuario.isActivo()).isTrue();
		verify(usuarioRepository, never()).save(any(Usuario.class));
		verify(viajeRepository, never()).findByUsuarioAndEstadoIn(anyString(), anyCollection());
	}

	@Test
	@DisplayName("baja CA2: con contraseña incorrecta responde 400 y no toca la cuenta ni los viajes")
	void rejectsWrongPassword() {
		Usuario usuario = usuario();
		when(usuarioRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(usuario));

		assertThatThrownBy(() -> service.darDeBaja(1L, new BajaUsuarioRequest("otra-clave"), true))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("la contraseña es incorrecta");

		assertThat(usuario.isActivo()).isTrue();
		verify(usuarioRepository, never()).save(any(Usuario.class));
		verify(viajeRepository, never()).saveAll(anyIterable());
	}

	@Test
	@DisplayName("baja CA4: un usuario inexistente o ya dado de baja responde 404")
	void failsWhenUserAlreadyDeactivated() {
		when(usuarioRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.darDeBaja(1L, new BajaUsuarioRequest(CONTRASENA), true))
				.isInstanceOf(ResourceNotFoundException.class);

		verify(usuarioRepository, never()).save(any(Usuario.class));
	}

	private Usuario usuario() {
		return Usuario.builder().id(1L).nombre("Ana Pérez").email(EMAIL)
				.contrasena(passwordEncoder.encode(CONTRASENA)).build();
	}

	private Viaje viaje(EstadoViaje estado) {
		return Viaje.builder().nombre("Escapada").usuario(EMAIL).estado(estado).build();
	}

}
