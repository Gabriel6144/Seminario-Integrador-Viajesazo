package com.viajesazo.turismo_backend.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.viajesazo.turismo_backend.model.Publicador;

@DataJpaTest
class PublicadorRepositoryTest {

	@Autowired
	private PublicadorRepository publicadorRepository;

	@Test
	@DisplayName("US7: el listado viene en orden alfabético, no en orden de inserción")
	void ordersByName() {
		// El orden es parte del contrato: el frontend muestra la grilla como la recibe, así que no
		// puede depender de en qué orden se insertaron los publicadores.
		save("Turismo Córdoba", "info@cordoba.gob.ar");
		save("Asociación de Artesanos", "artesanos@cordoba.gob.ar");
		save("Municipalidad de Cosquín", "cosquin@cordoba.gob.ar");

		Page<Publicador> publicadores = publicadorRepository
				.findAllByOrderByNombreAsc(Pageable.unpaged());

		assertThat(publicadores.getContent())
				.extracting(Publicador::getNombre)
				.containsExactly("Asociación de Artesanos", "Municipalidad de Cosquín", "Turismo Córdoba");
	}

	@Test
	@DisplayName("US7: la paginación parte el listado sin perder ni duplicar publicadores")
	void paginates() {
		save("Asociación de Artesanos", "artesanos@cordoba.gob.ar");
		save("Municipalidad de Cosquín", "cosquin@cordoba.gob.ar");
		save("Turismo Córdoba", "info@cordoba.gob.ar");

		Page<Publicador> firstPage = publicadorRepository
				.findAllByOrderByNombreAsc(PageRequest.of(0, 2));
		Page<Publicador> secondPage = publicadorRepository
				.findAllByOrderByNombreAsc(PageRequest.of(1, 2));

		assertThat(firstPage.getContent())
				.extracting(Publicador::getNombre)
				.containsExactly("Asociación de Artesanos", "Municipalidad de Cosquín");
		assertThat(secondPage.getContent()).extracting(Publicador::getNombre).containsExactly("Turismo Córdoba");
		assertThat(firstPage.getTotalElements()).isEqualTo(3);
		assertThat(firstPage.getTotalPages()).isEqualTo(2);
		assertThat(firstPage.isLast()).isFalse();
		assertThat(secondPage.isLast()).isTrue();
	}

	@Test
	@DisplayName("US7: sin publicadores cargados devuelve una página vacía, no un 404")
	void returnsEmptyPage() {
		Page<Publicador> publicadores = publicadorRepository
				.findAllByOrderByNombreAsc(PageRequest.of(0, 20));

		assertThat(publicadores.getContent()).isEmpty();
		assertThat(publicadores.getTotalElements()).isZero();
	}

	@Test
	@DisplayName("el pre-chequeo de email encuentra lo que ya está cargado y no lo que no")
	void detectsExistingEmail() {
		save("Turismo Córdoba", "info@cordoba.gob.ar");

		assertThat(publicadorRepository.existsByEmail("info@cordoba.gob.ar")).isTrue();
		assertThat(publicadorRepository.existsByEmail("nuevo@cordoba.gob.ar")).isFalse();
	}

	@Test
	@DisplayName("el UNIQUE del email existe: dos altas con el mismo correo rompen la constraint")
	void rejectsDuplicateEmailOnSave() {
		// Este es el hueco que el pre-chequeo de PublicadorService no cubre: dos altas
		// simultáneas pasan las dos el existsByEmail y sólo la segunda revienta. El test fija que
		// ahí sí salta DataIntegrityViolationException, que es justo lo que atiende
		// GlobalExceptionHandler#handleIntegrityViolation para devolver 400 en vez de 500.
		save("Turismo Córdoba", "info@cordoba.gob.ar");

		assertThatThrownBy(() -> publicadorRepository.saveAndFlush(
				Publicador.builder().nombre("Otro nombre").email("info@cordoba.gob.ar").build()))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	private void save(String nombre, String email) {
		publicadorRepository.save(Publicador.builder().nombre(nombre).email(email).build());
	}

}
