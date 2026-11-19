package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.viajesazo.turismo_backend.dto.response.PublicadorAgendaItemResponse;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.Modalidad;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.repository.ActividadRepository;
import com.viajesazo.turismo_backend.repository.EventoRepository;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.security.TestSecuritySupport;

@ExtendWith(MockitoExtension.class)
class PublicadorAgendaServiceTest {

	@Mock
	private UsuarioRepository usuarioRepository;

	@Mock
	private EventoRepository eventoRepository;

	@Mock
	private ActividadRepository actividadRepository;

	@Mock
	private InscriptosService inscriptosService;

	@InjectMocks
	private PublicadorAgendaService service;

	@BeforeEach
	void setUp() {
		Publicador publicador = Publicador.builder()
				.id(1L)
				.nombre("Turismo Córdoba")
				.email("turismo@cordoba.gob.ar")
				.build();
		Usuario usuario = Usuario.builder()
				.id(10L)
				.nombre("Pub")
				.email("pub@test.com")
				.contrasena("hash")
				.publicador(publicador)
				.build();
		TestSecuritySupport.authenticate(usuario, publicador.getId(), Rol.PUBLICADOR);
		when(usuarioRepository.findByIdAndActivoTrue(10L)).thenReturn(Optional.of(usuario));
	}

	@AfterEach
	void tearDown() {
		TestSecuritySupport.clear();
	}

	@Test
	@DisplayName("listarAgenda incluye descripción y permite varios ítems el mismo día")
	void listarAgendaIncludesDescripcionAndSameDayItems() {
		Evento evento = new Evento();
		evento.setId(1L);
		evento.setNombre("Festival");
		evento.setDescripcion("Música en vivo");
		evento.setFechaInicio(LocalDate.parse("2026-10-01"));
		evento.setFechaFin(LocalDate.parse("2026-10-01"));
		evento.setModalidad(Modalidad.PEDESTRE);
		evento.setHorarioInicio(LocalTime.of(18, 0));
		evento.setHorarioFin(LocalTime.of(22, 0));
		evento.setImagenes(new ArrayList<>(List.of("https://cdn.example/festival.jpg")));

		Actividad actividad = new Actividad();
		actividad.setId(2L);
		actividad.setNombre("Visita guiada");
		actividad.setDescripcion("Recorrido por el centro");
		actividad.setFechaInicio(LocalDate.parse("2026-10-01"));
		actividad.setFechaFin(LocalDate.parse("2026-10-01"));
		actividad.setModalidad(Modalidad.PEDESTRE);
		actividad.setImagenes(new ArrayList<>());

		when(eventoRepository.findAllByPublicadorId(1L)).thenReturn(List.of(evento));
		when(actividadRepository.findAllByPublicadorId(1L)).thenReturn(List.of(actividad));

		List<PublicadorAgendaItemResponse> items = service.listarAgenda();

		assertThat(items).hasSize(2);
		assertThat(items).extracting(PublicadorAgendaItemResponse::fechaInicio)
				.containsOnly(LocalDate.parse("2026-10-01"));
		assertThat(items).extracting(PublicadorAgendaItemResponse::descripcion)
				.containsExactlyInAnyOrder("Música en vivo", "Recorrido por el centro");
	}
}
