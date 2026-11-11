package com.viajesazo.turismo_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.viajesazo.turismo_backend.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

	/**
	 * Pre-chequeo de unicidad del email antes del alta, mismo criterio que
	 * {@code PublicadorRepository#existsByEmail}: convierte el duplicado en un 400 con mensaje útil
	 * en lugar del error de constraint de la base. Es case-sensitive, igual que la columna.
	 */
	boolean existsByEmail(String email);

}
