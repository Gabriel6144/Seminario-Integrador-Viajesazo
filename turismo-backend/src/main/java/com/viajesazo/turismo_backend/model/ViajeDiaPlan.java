package com.viajesazo.turismo_backend.model;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ViajeDiaPlan {

	@Column(name = "fecha", nullable = false)
	private LocalDate fecha;

	@Column(name = "cantidad_eventos", nullable = false)
	private int cantidadEventos;

	@Column(name = "cantidad_actividades", nullable = false)
	private int cantidadActividades;
}
