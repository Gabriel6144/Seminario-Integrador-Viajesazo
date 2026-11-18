package com.viajesazo.turismo_backend.model;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.*;
import lombok.*;

/**
 * Cuenta de usuario. Los constructores los genera Lombok ({@code @NoArgsConstructor} para JPA y
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
	 * para la API la cuenta deja de existir (consultas → 404). El login también filtra por este campo.
	 */
	@Builder.Default
	@Column(nullable = false)
	private boolean activo = true;

	/** Alta de la cuenta (métricas de registros nuevos). */
	@Builder.Default
	@Column(nullable = false)
	private Instant creadoEn = Instant.now();

	/** Último login/refresh exitoso (métricas de usuarios activos). */
	@Column
	private Instant ultimoAccesoEn;

	@Builder.Default
	@ElementCollection(fetch = FetchType.EAGER)
	@Enumerated(EnumType.STRING)
	@CollectionTable(name = "usuario_roles", joinColumns = @JoinColumn(name = "usuario_id"))
	@Column(name = "rol", nullable = false, length = 40)
	private Set<Rol> roles = new HashSet<>();

	/**
	 * Perfil de publicador vinculado (1:1). Obligatorio si el usuario tiene el rol {@link Rol#PUBLICADOR}.
	 */
	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "publicador_id", unique = true)
	private Publicador publicador;

	/** Da de baja la cuenta (baja lógica). */
	public void darDeBaja() {
		this.activo = false;
	}

	public boolean tieneRol(Rol rol) {
		return roles != null && roles.contains(rol);
	}

}
