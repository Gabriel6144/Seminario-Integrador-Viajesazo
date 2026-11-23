package com.viajesazo.turismo_backend.model;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Meta por día del circuito: snapshot de la generación + decisiones del usuario
 * (sugerencias aceptadas / "Dejarlo así"). Se regenera limpio con el circuito.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class CircuitoDiaEstado {

	@Column(nullable = false)
	private LocalDate fecha;

	/** Paradas asignadas por la generación (foto fija). */
	@Column(nullable = false)
	private int asignadas;

	/** Mínimo pedido ese día según ritmo / plan diario. */
	@Column(nullable = false)
	private int minimo;

	/** Mensaje de la generación (p. ej. día incompleto). */
	@Column(length = 500)
	private String mensaje;

	@Column(nullable = false)
	private int agregadasPorUsuario;

	@Column(nullable = false)
	private boolean avisoDescartado;

	public CircuitoDiaEstado(LocalDate fecha, int asignadas, int minimo, String mensaje) {
		this.fecha = fecha;
		this.asignadas = asignadas;
		this.minimo = minimo;
		this.mensaje = mensaje;
		this.agregadasPorUsuario = 0;
		this.avisoDescartado = false;
	}
}
