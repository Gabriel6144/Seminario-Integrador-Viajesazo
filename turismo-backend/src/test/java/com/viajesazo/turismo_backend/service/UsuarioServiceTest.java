package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.AfterEach;
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
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.repository.PublicadorRepository;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.repository.ViajeRepository;
import com.viajesazo.turismo_backend.security.RefreshTokenService;
import com.viajesazo.turismo_backend.security.TestSecuritySupport;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

	private static final String CONTRASENA = "secreta123";
	private static final String EMAIL = "ana@mail.com";

	@Mock
	private UsuarioRepository usuarioRepository;

	@Mock
	private ViajeRepository viajeRepository;

	@Mock
	private RefreshTokenService refreshTokenService;

	@Mock
	private PublicadorRepository publicadorRepository;

	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

	private UsuarioService service;

	@BeforeEach
	void setUp() {
		service = new UsuarioService(usuarioRepository, new UsuarioMapperImpl(), passwordEncoder, viajeRepository,
				refreshTokenService, publicadorRepository);
		TestSecuritySupport.authenticateTurista(TestSecuritySupport.turista(1L, EMAIL));
	}

	@AfterEach
	void tearDown() {
		TestSecuritySupport.clear();
	}

	@Test
	@DisplayName("registra el usuario con sus datos, activo y rol TURISTA")
	void createsUser() {
		when(usuarioRepository.existsByEmail(EMAIL)).thenReturn(false);
		when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> {
			Usuario saved = invocation.getArgument(0);
			saved.setId(1L);
			return saved;
		});

		UsuarioResponse result = service.create(new UsuarioRequest("Ana Pérez", EMAIL, "351-5551234", CONTRASENA, Rol.TURISTA));

		assertThat(result.id()).isEqualTo(1L);
		assertThat(result.nombre()).isEqualTo("Ana Pérez");
		assertThat(result.email()).isEqualTo(EMAIL);
		assertThat(result.telefono()).isEqualTo("351-5551234");
		assertThat(result.roles()).containsExactly(Rol.TURISTA);

		ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
		verify(usuarioRepository).save(captor.capture());
		assertThat(captor.getValue().isActivo()).isTrue();
		assertThat(captor.getValue().getRoles()).containsExactly(Rol.TURISTA);
	}

	@Test
	@DisplayName("guarda la contraseña como hash BCrypt, nunca en texto plano")
	void storesHashedPassword() {
		when(usuarioRepository.existsByEmail(EMAIL)).thenReturn(false);
		when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

		service.create(new UsuarioRequest("Ana Pérez", EMAIL, null, CONTRASENA, Rol.TURISTA));

		ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
		verify(usuarioRepository).save(captor.capture());
		String guardada = captor.getValue().getContrasena();
		assertThat(guardada).isNotEqualTo(CONTRASENA).startsWith("$2");
		assertThat(passwordEncoder.matches(CONTRASENA, guardada)).isTrue();
	}

	@Test
	@DisplayName("una contraseña de menos de 72 caracteres pero más de 72 bytes da 400, no 500")
	void rejectsPasswordOverBcryptByteLimit() {
		String larga = "ñ".repeat(40);

		assertThatThrownBy(() -> service.create(new UsuarioRequest("Ana Pérez", EMAIL, null, larga, Rol.TURISTA)))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("demasiado larga");

		verify(usuarioRepository, never()).save(any(Usuario.class));
	}

	@Test
	@DisplayName("un email ya registrado se rechaza sin llegar a escribir")
	void rejectsDuplicateEmail() {
		when(usuarioRepository.existsByEmail(EMAIL)).thenReturn(true);

		assertThatThrownBy(() -> service.create(new UsuarioRequest("Ana Pérez", EMAIL, null, CONTRASENA, Rol.TURISTA)))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("ya existe un usuario con ese email");

		verify(usuarioRepository, never()).save(any(Usuario.class));
	}

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

	@Test
	@DisplayName("baja CA3/CA5: marca la cuenta inactiva, cancela viajes y revoca refresh tokens")
	void deactivatesUserAndCancelsTrips() {
		Usuario usuario = usuario();
		Viaje borrador = viaje(EstadoViaje.BORRADOR);
		Viaje planificado = viaje(EstadoViaje.PLANIFICADO);
		when(usuarioRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(usuario));
		when(viajeRepository.findByUsuarioAndEstadoIn(eq(usuario), anyCollection()))
				.thenReturn(List.of(borrador, planificado));

		BajaUsuarioResponse result = service.darDeBaja(1L, new BajaUsuarioRequest(CONTRASENA), true);

		assertThat(usuario.isActivo()).isFalse();
		verify(usuarioRepository).save(usuario);
		assertThat(borrador.getEstado()).isEqualTo(EstadoViaje.CANCELADO);
		assertThat(planificado.getEstado()).isEqualTo(EstadoViaje.CANCELADO);
		verify(viajeRepository).saveAll(List.of(borrador, planificado));
		verify(refreshTokenService).revokeAllForUsuario(1L);
		assertThat(result.id()).isEqualTo(1L);
		assertThat(result.viajesCancelados()).isEqualTo(2);
		assertThat(result.mensaje()).isEqualTo("la cuenta se dio de baja correctamente");
	}

	@Test
	@DisplayName("baja CA5: solo busca viajes BORRADOR y PLANIFICADO; EN_CURSO no se puede cancelar")
	void onlyCancelsCancellableTrips() {
		Usuario usuario = usuario();
		when(usuarioRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(usuario));
		when(viajeRepository.findByUsuarioAndEstadoIn(eq(usuario), anyCollection())).thenReturn(List.of());

		BajaUsuarioResponse result = service.darDeBaja(1L, new BajaUsuarioRequest(CONTRASENA), true);

		@SuppressWarnings("unchecked")
		ArgumentCaptor<Collection<EstadoViaje>> captor = ArgumentCaptor.forClass(Collection.class);
		verify(viajeRepository).findByUsuarioAndEstadoIn(eq(usuario), captor.capture());
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
		verify(viajeRepository, never()).findByUsuarioAndEstadoIn(any(), anyCollection());
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

	@Test
	@DisplayName("asigna roles y exige publicador vinculado si entra PUBLICADOR")
	void assignRolesRequiresPublicador() {
		Usuario usuario = usuario();
		when(usuarioRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(usuario));

		assertThatThrownBy(() -> service.assignRoles(1L, Rol.PUBLICADOR))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("publicador vinculado");
	}

	@Test
	@DisplayName("al quitar PUBLICADOR desvincula el publicador")
	void assignRolesUnlinksPublicador() {
		Publicador publicador = Publicador.builder().id(9L).nombre("Pub").email("p@x.com").build();
		Usuario usuario = usuario();
		usuario.setPublicador(publicador);
		usuario.setRoles(new HashSet<>(Set.of(Rol.PUBLICADOR)));
		when(usuarioRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(usuario));
		when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

		UsuarioResponse result = service.assignRoles(1L, Rol.TURISTA);

		assertThat(result.roles()).containsExactly(Rol.TURISTA);
		assertThat(result.publicadorId()).isNull();
		assertThat(usuario.getPublicador()).isNull();
	}

	@Test
	@DisplayName("vincula publicador y asegura el rol PUBLICADOR")
	void linksPublicador() {
		Usuario usuario = usuario();
		Publicador publicador = Publicador.builder().id(3L).nombre("Pub").email("p@x.com").build();
		when(usuarioRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(usuario));
		when(publicadorRepository.findById(3L)).thenReturn(Optional.of(publicador));
		when(usuarioRepository.existsByPublicadorId(3L)).thenReturn(false);
		when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

		UsuarioResponse result = service.linkPublicador(1L, 3L);

		assertThat(result.publicadorId()).isEqualTo(3L);
		assertThat(result.roles()).containsExactly(Rol.PUBLICADOR);
	}

	private Usuario usuario() {
		return Usuario.builder().id(1L).nombre("Ana Pérez").email(EMAIL)
				.contrasena(passwordEncoder.encode(CONTRASENA))
				.roles(new HashSet<>(Set.of(Rol.TURISTA)))
				.build();
	}

	private Viaje viaje(EstadoViaje estado) {
		return Viaje.builder().nombre("Escapada").usuario(usuario()).estado(estado).build();
	}

}
