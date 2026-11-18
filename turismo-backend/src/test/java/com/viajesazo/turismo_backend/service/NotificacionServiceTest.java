package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.viajesazo.turismo_backend.dto.response.ReprogramarPreviewResponse;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.Notificacion;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.repository.CircuitoItemRepository;
import com.viajesazo.turismo_backend.repository.EventoRepository;
import com.viajesazo.turismo_backend.repository.NotificacionRepository;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.security.TestSecuritySupport;

@ExtendWith(MockitoExtension.class)
class NotificacionServiceTest {

	@Mock
	private NotificacionRepository notificacionRepository;

	@Mock
	private CircuitoItemRepository circuitoItemRepository;

	@Mock
	private EventoRepository eventoRepository;

	@Mock
	private UsuarioRepository usuarioRepository;

	@InjectMocks
	private NotificacionService service;

	@AfterEach
	void tearDown() {
		TestSecuritySupport.clear();
	}

	@Test
	@DisplayName("preview incluye conteo de destinatarios y plantilla de cuerpo")
	void previewIncludesCountAndTemplate() {
		Publicador publicador = Publicador.builder().id(10L).nombre("Turismo Córdoba").build();
		Usuario pubUser = Usuario.builder()
				.id(2L)
				.nombre("Publicador")
				.email("publicador@test.com")
				.contrasena("hash")
				.activo(true)
				.roles(Set.of(Rol.PUBLICADOR))
				.publicador(publicador)
				.build();
		TestSecuritySupport.authenticate(pubUser, 10L, Rol.PUBLICADOR);

		Evento evento = Evento.builder()
				.id(7L)
				.nombre("Festival")
				.fechaInicio(LocalDate.parse("2026-10-01"))
				.fechaFin(LocalDate.parse("2026-10-03"))
				.publicador(publicador)
				.build();
		when(eventoRepository.findById(7L)).thenReturn(Optional.of(evento));
		when(circuitoItemRepository.countInscriptosByPropuestaId(7L)).thenReturn(3L);

		ReprogramarPreviewResponse preview =
				service.previewReprogramacion(7L, LocalDate.parse("2026-12-01"));

		assertThat(preview.destinatarios()).isEqualTo(3L);
		assertThat(preview.titulo()).contains("Festival");
		assertThat(preview.cuerpo()).contains("Festival");
		assertThat(preview.cuerpo()).contains("1/10/2026");
		assertThat(preview.cuerpo()).contains("1/12/2026");
	}

	@Test
	@DisplayName("notificarReprogramacion crea una fila por turista afectado")
	void notifyCreatesOnePerTurista() {
		Publicador publicador = Publicador.builder().id(10L).nombre("Turismo Córdoba").build();
		Evento evento = Evento.builder()
				.id(7L)
				.nombre("Festival")
				.fechaInicio(LocalDate.parse("2026-12-01"))
				.fechaFin(LocalDate.parse("2026-12-03"))
				.publicador(publicador)
				.build();

		Usuario t1 = Usuario.builder().id(1L).nombre("T1").email("t1@test.com").contrasena("h").activo(true).build();
		Usuario t2 = Usuario.builder().id(2L).nombre("T2").email("t2@test.com").contrasena("h").activo(true).build();

		when(circuitoItemRepository.findUsuarioIdsInscriptosByPropuestaId(7L)).thenReturn(List.of(1L, 2L));
		when(usuarioRepository.findById(1L)).thenReturn(Optional.of(t1));
		when(usuarioRepository.findById(2L)).thenReturn(Optional.of(t2));
		when(notificacionRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

		service.notificarReprogramacion(
				evento, LocalDate.parse("2026-10-01"), LocalDate.parse("2026-10-03"));

		@SuppressWarnings("unchecked")
		ArgumentCaptor<List<Notificacion>> captor = ArgumentCaptor.forClass(List.class);
		verify(notificacionRepository).saveAll(captor.capture());
		assertThat(captor.getValue()).hasSize(2);
		assertThat(captor.getValue()).allMatch(n -> n.getTipo().equals(NotificacionService.TIPO_EVENTO_REPROGRAMADO));
		assertThat(captor.getValue()).allMatch(n -> n.getPropuestaId().equals(7L));
		assertThat(captor.getValue().get(0).getCuerpo()).contains("1/10/2026");
		assertThat(captor.getValue().get(0).getCuerpo()).contains("1/12/2026");
	}

	@Test
	@DisplayName("notificarReprogramacion no persiste si no hay inscriptos")
	void notifySkipsWhenNoInscriptos() {
		Evento evento = Evento.builder().id(7L).nombre("Festival")
				.fechaInicio(LocalDate.parse("2026-12-01"))
				.fechaFin(LocalDate.parse("2026-12-01"))
				.build();
		when(circuitoItemRepository.findUsuarioIdsInscriptosByPropuestaId(7L)).thenReturn(List.of());

		service.notificarReprogramacion(
				evento, LocalDate.parse("2026-10-01"), LocalDate.parse("2026-10-01"));

		verify(notificacionRepository, never()).saveAll(anyList());
	}
}
