package com.viajesazo.turismo_backend.model;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import com.viajesazo.turismo_backend.exception.InvariantViolationException;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "actividad")
@DiscriminatorValue("ACTIVIDAD")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Actividad extends PropuestaTuristica {

	@Column(name = "duracion_minutos", nullable = false)
	private int duracionMinutos;

	/**
	 * Las franjas son parte del agregado: se guardan en una tabla propia pero no tienen
	 * identidad ni repositorio. El {@code orden} conserva el orden en que las cargó el publicador.
	 */
	@ElementCollection(fetch = FetchType.LAZY)
	@CollectionTable(name = "actividad_disponibilidad", joinColumns = @JoinColumn(name = "actividad_id"))
	@OrderColumn(name = "orden")
	private List<Disponibilidad> disponibilidades = new ArrayList<>();

	@Override
	public TipoRegistro getTipo() {
		return TipoRegistro.ACTIVIDAD;
	}

	@Override
	public Set<TipoPropuesta> tiposPermitidos() {
		return EnumSet.allOf(TipoPropuesta.class);
	}

	/**
	 * Una actividad sin duración positiva no se puede itinerar. Cada franja debe tener día y un
	 * rango horario coherente; se permite la lista vacía porque el publicador puede completarla
	 * después.
	 */
	@Override
	protected void validarInvariantesEspecificas() {
		if (duracionMinutos <= 0) {
			throw new InvariantViolationException("la duración de la actividad debe ser mayor a cero");
		}
		for (Disponibilidad disponibilidad : disponibilidades) {
			if (disponibilidad == null || disponibilidad.getDiaSemana() == null) {
				throw new InvariantViolationException("cada disponibilidad debe indicar el día de la semana");
			}
			if (disponibilidad.getHoraInicio() == null || disponibilidad.getHoraFin() == null) {
				throw new InvariantViolationException("cada disponibilidad debe indicar hora de inicio y de fin");
			}
			if (!disponibilidad.getHoraFin().isAfter(disponibilidad.getHoraInicio())) {
				throw new InvariantViolationException("la hora de fin de una disponibilidad debe ser posterior a la de inicio");
			}
		}
	}
}
