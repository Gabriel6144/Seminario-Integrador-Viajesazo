package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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

import com.viajesazo.turismo_backend.dto.request.UsuarioRequest;
import com.viajesazo.turismo_backend.dto.response.UsuarioResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.UsuarioMapperImpl;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

	private static final String CONTRASENA = "secreta123";

	@Mock
	private UsuarioRepository usuarioRepository;

	// Encoder real: lo que se prueba es justamente que se guarde un hash verificable.
	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

	private UsuarioService service;

	@BeforeEach
	void setUp() {
		service = new UsuarioService(usuarioRepository, new UsuarioMapperImpl(), passwordEncoder);
	}

	@Test
	@DisplayName("registra el usuario con sus datos")
	void createsUser() {
		when(usuarioRepository.existsByEmail("ana@mail.com")).thenReturn(false);
		when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> {
			Usuario saved = invocation.getArgument(0);
			saved.setId(1L);
			return saved;
		});

		UsuarioResponse result = service.create(
				new UsuarioRequest("Ana Pérez", "ana@mail.com", "351-5551234", CONTRASENA));

		assertThat(result.id()).isEqualTo(1L);
		assertThat(result.nombre()).isEqualTo("Ana Pérez");
		assertThat(result.email()).isEqualTo("ana@mail.com");
		assertThat(result.telefono()).isEqualTo("351-5551234");
	}

	@Test
	@DisplayName("guarda la contraseña como hash BCrypt, nunca en texto plano")
	void storesHashedPassword() {
		when(usuarioRepository.existsByEmail("ana@mail.com")).thenReturn(false);
		when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

		service.create(new UsuarioRequest("Ana Pérez", "ana@mail.com", null, CONTRASENA));

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

		assertThatThrownBy(() -> service.create(new UsuarioRequest("Ana Pérez", "ana@mail.com", null, larga)))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("demasiado larga");

		verify(usuarioRepository, never()).save(any(Usuario.class));
	}

	@Test
	@DisplayName("un email ya registrado se rechaza sin llegar a escribir")
	void rejectsDuplicateEmail() {
		when(usuarioRepository.existsByEmail("ana@mail.com")).thenReturn(true);

		assertThatThrownBy(() -> service.create(new UsuarioRequest("Ana Pérez", "ana@mail.com", null, CONTRASENA)))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("ya existe un usuario con ese email");

		verify(usuarioRepository, never()).save(any(Usuario.class));
	}

	@Test
	@DisplayName("consulta un usuario existente")
	void findsUser() {
		when(usuarioRepository.findById(1L)).thenReturn(Optional.of(
				Usuario.builder().id(1L).nombre("Ana Pérez").email("ana@mail.com").contrasena("$2a$hash").build()));

		assertThat(service.findById(1L).nombre()).isEqualTo("Ana Pérez");
	}

	@Test
	@DisplayName("consultar un usuario inexistente devuelve 404")
	void failsWhenUserNotFound() {
		when(usuarioRepository.findById(404L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.findById(404L))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessageContaining("404");
	}

}
