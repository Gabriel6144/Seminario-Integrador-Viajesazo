package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.viajesazo.turismo_backend.dto.request.PublicadorRequest;
import com.viajesazo.turismo_backend.dto.response.PublicadorResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.PublicadorMapperImpl;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.repository.PublicadorRepository;

@ExtendWith(MockitoExtension.class)
class PublicadorServiceTest {

	@Mock
	private PublicadorRepository publicadorRepository;

	private PublicadorService service;

	@BeforeEach
	void setUp() {
		service = new PublicadorService(publicadorRepository, new PublicadorMapperImpl());
	}

	@Test
	@DisplayName("registra el publicador con sus datos de contacto")
	void createsPublisher() {
		when(publicadorRepository.save(any(Publicador.class))).thenAnswer(invocation -> {
			Publicador saved = invocation.getArgument(0);
			saved.setId(1L);
			return saved;
		});

		PublicadorResponse result = service.create(
				new PublicadorRequest("Turismo Córdoba", "info@cordoba.gob.ar", "0351-1234567"));

		assertThat(result.id()).isEqualTo(1L);
		assertThat(result.nombre()).isEqualTo("Turismo Córdoba");
		assertThat(result.email()).isEqualTo("info@cordoba.gob.ar");
		assertThat(result.telefono()).isEqualTo("0351-1234567");
	}

	@Test
	@DisplayName("un email duplicado se rechaza con 400 y sin llegar a escribir")
	void rejectsDuplicateEmail() {
		when(publicadorRepository.existsByEmail("info@cordoba.gob.ar")).thenReturn(true);

		assertThatThrownBy(() -> service.create(
				new PublicadorRequest("Turismo Córdoba", "info@cordoba.gob.ar", null)))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("ya existe un publicador con ese email");

		// Que no escriba es la mitad del arreglo: si salvara igual, la base lo rechaza y el
		// cliente vuelve a ver un 500.
		verify(publicadorRepository, never()).save(any(Publicador.class));
	}

	@Test
	@DisplayName("un email libre pasa el pre-chequeo y se registra")
	void createsWhenEmailIsFree() {
		when(publicadorRepository.existsByEmail("nuevo@cordoba.gob.ar")).thenReturn(false);
		when(publicadorRepository.save(any(Publicador.class))).thenAnswer(invocation -> {
			Publicador saved = invocation.getArgument(0);
			saved.setId(9L);
			return saved;
		});

		PublicadorResponse result = service.create(
				new PublicadorRequest("Nuevo publicador", "nuevo@cordoba.gob.ar", null));

		assertThat(result.id()).isEqualTo(9L);
		assertThat(result.email()).isEqualTo("nuevo@cordoba.gob.ar");
	}

	@Test
	@DisplayName("consulta un publicador existente")
	void findsPublisher() {
		when(publicadorRepository.findById(1L)).thenReturn(Optional.of(publisher()));

		PublicadorResponse result = service.findById(1L);

		assertThat(result.nombre()).isEqualTo("Turismo Córdoba");
	}

	@Test
	@DisplayName("consultar un publicador inexistente devuelve 404")
	void failsWhenPublisherNotFound() {
		when(publicadorRepository.findById(404L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.findById(404L))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessageContaining("404");
	}

	@Test
	@DisplayName("US7: lista los publicadores delegando el orden y la página en el repository")
	void listsPublishers() {
		// El orden alfabético es responsabilidad del repository: el service no reordena, solo mapea.
		when(publicadorRepository.findAllByOrderByNombreAsc(any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(
						Publicador.builder().id(1L).nombre("Asociación de Artesanos")
								.email("artesanos@cordoba.gob.ar").build(),
						Publicador.builder().id(2L).nombre("Turismo Córdoba")
								.email("info@cordoba.gob.ar").build()),
						PageRequest.of(0, 20), 2));

		Page<PublicadorResponse> result = service.findAll(PageRequest.of(0, 20));

		assertThat(result.getContent())
				.extracting(PublicadorResponse::nombre)
				.containsExactly("Asociación de Artesanos", "Turismo Córdoba");
		assertThat(result.getTotalElements()).isEqualTo(2);
	}

	@Test
	@DisplayName("US7: un listado sin publicadores devuelve una página vacía, no un 404")
	void listsPublishersEmpty() {
		when(publicadorRepository.findAllByOrderByNombreAsc(any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

		Page<PublicadorResponse> result = service.findAll(PageRequest.of(0, 20));

		assertThat(result.getContent()).isEmpty();
		assertThat(result.getTotalElements()).isZero();
	}

	private Publicador publisher() {
		return Publicador.builder().id(1L).nombre("Turismo Córdoba").email("info@cordoba.gob.ar").build();
	}

}
