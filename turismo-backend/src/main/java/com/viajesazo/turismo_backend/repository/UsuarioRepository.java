package com.viajesazo.turismo_backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.viajesazo.turismo_backend.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

	/**
	 * Pre-chequeo de unicidad del email antes del alta, mismo criterio que
	 * {@code PublicadorRepository#existsByEmail}: convierte el duplicado en un 400 con mensaje útil
	 * en lugar del error de constraint de la base. Es case-sensitive, igual que la columna.
	 *
	 * <p>Incluye a los usuarios dados de baja a propósito: la fila sigue existiendo y la constraint
	 * {@code UNIQUE} del email también, así que un email dado de baja no se puede volver a registrar.
	 */
	boolean existsByEmail(String email);

	/**
	 * Usuario activo por id. Es el único acceso por id que debe usar la API: un usuario dado de baja
	 * no existe para ella (consulta y baja → 404).
	 */
	Optional<Usuario> findByIdAndActivoTrue(Long id);

}
