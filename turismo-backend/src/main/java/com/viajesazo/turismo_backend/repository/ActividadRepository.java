package com.viajesazo.turismo_backend.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.viajesazo.turismo_backend.model.Actividad;

public interface ActividadRepository extends JpaRepository<Actividad, Long> {

	Page<Actividad> findAllByOrderByNombreAsc(Pageable pageable);

	@Query("""
			SELECT a FROM Actividad a
			WHERE a.publicador.id = :publicadorId
			ORDER BY a.fechaInicio ASC, a.nombre ASC
			""")
	List<Actividad> findAllByPublicadorId(@Param("publicadorId") Long publicadorId);

	@Query("""
			SELECT COUNT(a) > 0 FROM Actividad a
			WHERE a.publicador.id = :publicadorId
			  AND a.fechaFin >= :inicio
			  AND a.fechaInicio <= :fin
			  AND (:excludeId IS NULL OR a.id <> :excludeId)
			""")
	boolean existsOverlapping(@Param("publicadorId") Long publicadorId,
			@Param("inicio") LocalDate inicio,
			@Param("fin") LocalDate fin,
			@Param("excludeId") Long excludeId);
}
