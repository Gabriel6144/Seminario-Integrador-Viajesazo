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

}
