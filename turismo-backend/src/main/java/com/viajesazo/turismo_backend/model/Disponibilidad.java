package com.viajesazo.turismo_backend.model;

import java.time.DayOfWeek;
import java.time.LocalTime;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Franja horaria semanal en la que se puede realizar una actividad. Es un valor del agregado
 * {@link Actividad}: no tiene identidad propia ni se consulta por separado.
 */
@Embeddable
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Disponibilidad {

	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Enumerated(EnumType.STRING)
	private DayOfWeek diaSemana;

	private LocalTime horaInicio;

	private LocalTime horaFin;
}
