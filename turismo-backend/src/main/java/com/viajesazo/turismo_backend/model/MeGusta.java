package com.viajesazo.turismo_backend.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Like de un turista sobre una propuesta (evento o actividad).
 * Más adelante alimentará puntos por {@link InteresCategoria} al generar circuitos.
 */
@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(
		name = "me_gusta",
		uniqueConstraints = @UniqueConstraint(
				name = "uk_me_gusta_usuario_propuesta",
				columnNames = { "usuario_id", "propuesta_id" }))
public class MeGusta {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "usuario_id", nullable = false)
	private Usuario usuario;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "propuesta_id", nullable = false)
	private PropuestaTuristica propuesta;

	@Builder.Default
	@Column(nullable = false)
	private Instant creadoEn = Instant.now();
}
