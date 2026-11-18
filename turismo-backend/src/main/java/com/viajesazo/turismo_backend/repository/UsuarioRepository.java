package com.viajesazo.turismo_backend.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.viajesazo.turismo_backend.model.Rol;
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

	/** Login y UserDetails: solo cuentas activas. */
	Optional<Usuario> findByEmailAndActivoTrue(String email);

	boolean existsByPublicadorId(Long publicadorId);

	long countByActivoTrue();

	long countByActivoTrueAndUltimoAccesoEnGreaterThanEqual(Instant since);

	long countByActivoTrueAndCreadoEnGreaterThanEqual(Instant since);

	@Query("""
			SELECT COUNT(DISTINCT u.id) FROM Usuario u JOIN u.roles r
			WHERE u.activo = true AND r = :rol
			""")
	long countActivosByRol(@Param("rol") Rol rol);

	@Query("""
			SELECT u FROM Usuario u
			WHERE u.activo = true
			  AND (:q = '' OR LOWER(u.nombre) LIKE LOWER(CONCAT('%', :q, '%'))
			       OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')))
			  AND (:rol IS NULL OR EXISTS (SELECT 1 FROM u.roles r WHERE r = :rol))
			ORDER BY u.id DESC
			""")
	Page<Usuario> searchActivos(@Param("q") String q, @Param("rol") Rol rol, Pageable pageable);

}
