package com.viajesazo.turismo_backend.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.InvariantViolationException;

class PropuestaTuristicaTest {

	@Test
	@DisplayName("un evento válido expone su tipo y sus tipos de propuesta permitidos")
	void exposesEventType() {
		Evento evento = eventoValido();

		evento.validarInvariantes();

		assertThat(evento.getTipo()).isEqualTo(TipoRegistro.EVENTO);
		assertThat(evento.tiposPermitidos())
				.contains(TipoPropuesta.FESTIVAL, TipoPropuesta.FERIA)
				.doesNotContain(TipoPropuesta.VISITA_GUIADA);
	}

	@Test
	@DisplayName("un evento no acepta un tipo de propuesta reservado para actividades")
	void rejectsTypeNotAllowedForEvent() {
		Evento evento = eventoValido();
		evento.setTipoPropuesta(TipoPropuesta.VISITA_GUIADA);

		assertThatThrownBy(evento::validarInvariantes)
				.isInstanceOf(InvariantViolationException.class)
				.hasMessageContaining("VISITA_GUIADA");
	}

	@Test
	@DisplayName("la fecha de fin del evento no puede ser anterior a la de inicio")
	void rejectsEventEndingBeforeStart() {
		Evento evento = eventoValido();
		evento.setFechaFin(LocalDate.parse("2026-09-30"));

		assertThatThrownBy(evento::validarInvariantes)
				.isInstanceOf(InvariantViolationException.class)
				.hasMessageContaining("fecha de finalización");
	}

	@Test
	@DisplayName("un evento arancelado exige monto y sitio oficial")
	void rejectsPaidEventWithoutAmount() {
		Evento evento = eventoValido();
		evento.setTipoAcceso(TipoAcceso.DE_PAGO);

		assertThatThrownBy(evento::validarInvariantes)
				.isInstanceOf(InvariantViolationException.class)
				.hasMessageContaining("monto estimado");
	}

	@Test
	@DisplayName("INICIADO y REPROGRAMADO pueden cancelarse o finalizarse")
	void allowsTransitionsFromActiveStates() {
		Evento iniciado = eventoValido();
		iniciado.cambiarEstado(estado("REPROGRAMADO"));
		assertThat(iniciado.getNombreEstado()).isEqualTo(NombreEstado.REPROGRAMADO);

		iniciado.cambiarEstado(estado("REPROGRAMADO"));
		assertThat(iniciado.getNombreEstado()).isEqualTo(NombreEstado.REPROGRAMADO);

		iniciado.cambiarEstado(estado("FINALIZADO"));
		assertThat(iniciado.getNombreEstado()).isEqualTo(NombreEstado.FINALIZADO);
	}

	@Test
	@DisplayName("CANCELADO y FINALIZADO son terminales: no admiten otra transición ni edición")
	void rejectsChangesFromTerminalStates() {
		Evento cancelado = eventoValido();
		cancelado.cambiarEstado(estado("CANCELADO"));

		assertThatThrownBy(() -> cancelado.cambiarEstado(estado("REPROGRAMADO")))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("CANCELADO");
		assertThatThrownBy(cancelado::validarEditable)
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("cancelado");

		Evento finalizado = eventoValido();
		finalizado.cambiarEstado(estado("FINALIZADO"));

		assertThatThrownBy(() -> finalizado.cambiarEstado(estado("CANCELADO")))
				.isInstanceOf(BusinessRuleException.class);
	}

	@Test
	@DisplayName("un evento no terminal se puede editar")
	void allowsEditingActiveEvent() {
		assertThatCode(eventoValido()::validarEditable).doesNotThrowAnyException();
	}

	@Test
	@DisplayName("una actividad válida expone su tipo y acepta visitas guiadas y deportes")
	void exposesActivityType() {
		Actividad actividad = actividadValida();

		actividad.validarInvariantes();

		assertThat(actividad.getTipo()).isEqualTo(TipoRegistro.ACTIVIDAD);
		assertThat(actividad.tiposPermitidos())
				.containsExactlyInAnyOrder(TipoPropuesta.VISITA_GUIADA, TipoPropuesta.DEPORTIVO);
	}

	@Test
	@DisplayName("una actividad no acepta un tipo de propuesta reservado para eventos")
	void rejectsTypeNotAllowedForActivity() {
		Actividad actividad = actividadValida();
		actividad.setTipoPropuesta(TipoPropuesta.FESTIVAL);

		assertThatThrownBy(actividad::validarInvariantes)
				.isInstanceOf(InvariantViolationException.class)
				.hasMessageContaining("FESTIVAL");
	}

	@Test
	@DisplayName("la duración de una actividad debe ser positiva")
	void rejectsNonPositiveDuration() {
		Actividad actividad = actividadValida();
		actividad.setDuracionMinutos(0);

		assertThatThrownBy(actividad::validarInvariantes)
				.isInstanceOf(InvariantViolationException.class)
				.hasMessageContaining("duración");
	}

	@Test
	@DisplayName("una disponibilidad debe terminar después de empezar")
	void rejectsInvalidAvailabilityRange() {
		Actividad actividad = actividadValida();
		actividad.setDisponibilidades(List.of(Disponibilidad.builder()
				.diaSemana(DayOfWeek.MONDAY)
				.horaInicio(LocalTime.of(18, 0))
				.horaFin(LocalTime.of(17, 0))
				.build()));

		assertThatThrownBy(actividad::validarInvariantes)
				.isInstanceOf(InvariantViolationException.class)
				.hasMessageContaining("hora de fin");
	}

	private Evento eventoValido() {
		return Evento.builder()
				.nombre("Festival de Folklore")
				.tipoPropuesta(TipoPropuesta.FESTIVAL)
				.categoria(InteresCategoria.CULTURA)
				.estadoPropuesta(estado("INICIADO"))
				.publicador(Publicador.builder().id(1L).nombre("Turismo Córdoba").build())
				.ubicacion(Ubicacion.builder()
						.id(1L)
						.localidad("Cosquín")
						.direccion("Av. San Martín 800")
						.latitud(new BigDecimal("-31.41350000"))
						.longitud(new BigDecimal("-64.49470000"))
						.build())
				.fechaInicio(LocalDate.parse("2026-10-01"))
				.fechaFin(LocalDate.parse("2026-10-02"))
				.build();
	}

	private Actividad actividadValida() {
		Actividad actividad = new Actividad();
		actividad.setNombre("Visita guiada por el centro histórico");
		actividad.setTipoPropuesta(TipoPropuesta.VISITA_GUIADA);
		actividad.setCategoria(InteresCategoria.HISTORIA);
		actividad.setEstadoPropuesta(estado("INICIADO"));
		actividad.setPublicador(Publicador.builder().id(1L).nombre("Turismo Córdoba").build());
		actividad.setUbicacion(Ubicacion.builder().id(1L).localidad("Córdoba").build());
		actividad.setDuracionMinutos(90);
		actividad.setDisponibilidades(List.of(Disponibilidad.builder()
				.diaSemana(DayOfWeek.TUESDAY)
				.horaInicio(LocalTime.of(9, 0))
				.horaFin(LocalTime.of(12, 0))
				.build()));
		return actividad;
	}

	private EstadoPropuesta estado(String nombre) {
		return new EstadoPropuesta(1L, nombre, nombre);
	}
}
