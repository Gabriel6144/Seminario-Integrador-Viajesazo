package com.viajesazo.turismo_backend.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.viajesazo.turismo_backend.exception.BusinessRuleException;

class ViajeTest {

	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-15T12:00:00Z"), ZoneOffset.UTC);

	@Test
	@DisplayName("BORRADOR -> PLANIFICADO: completa el borrador con datos válidos")
	void plansDraft() {
		Viaje viaje = viaje(EstadoViaje.BORRADOR);

		viaje.planificar(CLOCK);

		assertThat(viaje.getEstado()).isEqualTo(EstadoViaje.PLANIFICADO);
	}

	@Test
	@DisplayName("no se puede planificar un borrador incompleto")
	void rejectsIncompleteDraft() {
		Viaje viaje = viaje(EstadoViaje.BORRADOR);
		viaje.setNombre(" ");
		viaje.setInteresesCategoria(List.of());

		assertThatThrownBy(() -> viaje.planificar(CLOCK))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("nombre")
				.hasMessageContaining("interés");
	}

	@Test
	@DisplayName("no se puede planificar un viaje con fecha de inicio pasada")
	void rejectsPastStartDate() {
		Viaje viaje = viaje(EstadoViaje.BORRADOR);

		assertThatThrownBy(() -> viaje.planificar(CLOCK))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("anterior a hoy");
	}

	@Test
	@DisplayName("PLANIFICADO -> CANCELADO: la baja lógica es válida")
	void cancelsPlannedTrip() {
		Viaje viaje = viaje(EstadoViaje.PLANIFICADO);

		viaje.cancelar();

		assertThat(viaje.getEstado()).isEqualTo(EstadoViaje.CANCELADO);
	}

	@Test
	@DisplayName("EN_CURSO -> CANCELADO: no se puede cancelar un viaje en curso")
	void cannotCancelOngoingTrip() {
		Viaje viaje = viaje(EstadoViaje.EN_CURSO);

		assertThatThrownBy(viaje::cancelar)
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("EN_CURSO");
		assertThat(viaje.getEstado()).isEqualTo(EstadoViaje.EN_CURSO);
	}

	@Test
	@DisplayName("un viaje en curso o finalizado no es editable")
	void blocksEditingActiveOrFinishedTrips() {
		Viaje enCurso = viaje(EstadoViaje.EN_CURSO);
		Viaje finalizado = viaje(EstadoViaje.FINALIZADO);

		assertThatThrownBy(enCurso::validarEditable).isInstanceOf(BusinessRuleException.class);
		assertThatThrownBy(finalizado::validarEditable).isInstanceOf(BusinessRuleException.class);
		viaje(EstadoViaje.PLANIFICADO).validarEditable();
	}

	@Test
	@DisplayName("transición automática: PLANIFICADO pasa a EN_CURSO al llegar la fecha de inicio")
	void startsAutomaticallyOnStartDate() {
		Viaje viaje = viaje(EstadoViaje.PLANIFICADO);

		viaje.actualizarEstadoPorFechas(LocalDate.parse("2026-10-20"));

		assertThat(viaje.getEstado()).isEqualTo(EstadoViaje.EN_CURSO);
	}

	@Test
	@DisplayName("transición automática: sigue EN_CURSO hasta el último día inclusive")
	void staysOngoingUntilEndDate() {
		Viaje viaje = viaje(EstadoViaje.EN_CURSO);

		viaje.actualizarEstadoPorFechas(LocalDate.parse("2026-10-22"));

		assertThat(viaje.getEstado()).isEqualTo(EstadoViaje.EN_CURSO);
	}

	@Test
	@DisplayName("transición automática: EN_CURSO pasa a FINALIZADO al día siguiente del fin")
	void finishesAutomaticallyAfterEndDate() {
		Viaje viaje = viaje(EstadoViaje.EN_CURSO);

		viaje.actualizarEstadoPorFechas(LocalDate.parse("2026-10-23"));

		assertThat(viaje.getEstado()).isEqualTo(EstadoViaje.FINALIZADO);
	}

	@Test
	@DisplayName("transición automática: un PLANIFICADO vencido salta a FINALIZADO")
	void catchesUpOverduePlannedTrip() {
		Viaje viaje = viaje(EstadoViaje.PLANIFICADO);

		viaje.actualizarEstadoPorFechas(LocalDate.parse("2026-10-23"));

		assertThat(viaje.getEstado()).isEqualTo(EstadoViaje.FINALIZADO);
	}

	@Test
	@DisplayName("transición automática: un borrador nunca cambia de estado")
	void neverTouchesDraft() {
		Viaje viaje = viaje(EstadoViaje.BORRADOR);

		viaje.actualizarEstadoPorFechas(LocalDate.parse("2026-10-23"));

		assertThat(viaje.getEstado()).isEqualTo(EstadoViaje.BORRADOR);
	}

	private Viaje viaje(EstadoViaje estado) {
		return Viaje.builder()
				.id(7L)
				.nombre("Escapada serrana")
				.zonaInteres(Ubicacion.builder()
						.ciudad("Villa General Belgrano")
						.localidad("Córdoba")
						.build())
				.rangoInteresKm(35.0)
				.fechaInicio(LocalDate.parse("2026-10-20"))
				.fechaFin(LocalDate.parse("2026-10-22"))
				.ritmo(TipoRitmo.EQUILIBRADO)
				.interesesCategoria(List.of(InteresCategoria.CULTURA))
				.estado(estado)
				.usuario("turista@test.com")
				.build();
	}
}
