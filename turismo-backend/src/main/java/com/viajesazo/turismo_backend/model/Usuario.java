package com.viajesazo.turismo_backend.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Turista registrado. Los constructores los genera Lombok ({@code @NoArgsConstructor} para JPA y
 * {@code @AllArgsConstructor} para el {@code @Builder}); escribirlos a mano choca con los generados
 * y no compila.
 */
@Entity
@Builder
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "usuario")
public class Usuario {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 120)
	private String nombre;

	@Column(nullable = false, unique = true, length = 180)
	private String email;

	@Column(length = 40)
	private String telefono;

	/** Hash BCrypt (60 caracteres), nunca la contraseña en texto plano. No se expone en la API. */
	@Column(nullable = false, length = 100)
	private String contrasena;

	/**
	 * Baja lógica: {@code false} cuando el usuario dio de baja su cuenta. La fila se conserva, pero
	 * para la API la cuenta deja de existir (consultas → 404). El login futuro también debe filtrar
	 * por este campo.
	 */
	@Builder.Default
	@Column(nullable = false)
	private boolean activo = true;

	/** Da de baja la cuenta (baja lógica). */
	public void darDeBaja() {
		this.activo = false;
	}

}
