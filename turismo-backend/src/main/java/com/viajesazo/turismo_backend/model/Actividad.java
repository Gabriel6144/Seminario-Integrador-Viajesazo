package com.viajesazo.turismo_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "actividad")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Actividad extends PropuestaTuristica {

	@Column(name = "duracion_minutos", nullable = false)
	private int duracionMinutos;
}
