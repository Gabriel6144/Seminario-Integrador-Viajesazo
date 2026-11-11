package com.viajesazo.turismo_backend.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Locale;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

import com.viajesazo.turismo_backend.model.Usuario;

@DataJpaTest
class UsuarioRepositoryTest {

	@Autowired
	private UsuarioRepository usuarioRepository;

	@Test
	@DisplayName("existsByEmail detecta un email ya registrado")
	void detectsExistingEmail() {
		usuarioRepository.saveAndFlush(Usuario.builder().nombre("Ana Pérez").email("ana@mail.com").contrasena("$2a$hash").build());

		assertThat(usuarioRepository.existsByEmail("ana@mail.com")).isTrue();
		assertThat(usuarioRepository.existsByEmail("otro@mail.com")).isFalse();
	}

	@Test
	@DisplayName("un usuario dado de baja no se encuentra por id; uno activo sí")
	void findByIdExcludesInactiveUsers() {
		Usuario activo = usuarioRepository.saveAndFlush(
				Usuario.builder().nombre("Ana Pérez").email("ana@mail.com").contrasena("$2a$hash").build());
		Usuario dadoDeBaja = Usuario.builder().nombre("Beto").email("beto@mail.com").contrasena("$2a$hash").build();
		dadoDeBaja.darDeBaja();
		dadoDeBaja = usuarioRepository.saveAndFlush(dadoDeBaja);

		assertThat(activo.isActivo()).isTrue();
		assertThat(usuarioRepository.findByIdAndActivoTrue(activo.getId())).isPresent();
		assertThat(usuarioRepository.findByIdAndActivoTrue(dadoDeBaja.getId())).isEmpty();
	}

	@Test
	@DisplayName("la base rechaza dos usuarios con el mismo email y el mensaje nombra usuario(email")
	void enforcesUniqueEmail() {
		usuarioRepository.saveAndFlush(Usuario.builder().nombre("Ana Pérez").email("ana@mail.com").contrasena("$2a$hash").build());

		// El texto importa: GlobalExceptionHandler elige el mensaje buscando "usuario(email".
		assertThatThrownBy(() -> usuarioRepository.saveAndFlush(
				Usuario.builder().nombre("Otra Ana").email("ana@mail.com").contrasena("$2a$hash").build()))
				.isInstanceOfSatisfying(DataIntegrityViolationException.class, ex -> assertThat(
						ex.getMostSpecificCause().getMessage().toLowerCase(Locale.ROOT))
						.contains("usuario(email"));
	}

}
