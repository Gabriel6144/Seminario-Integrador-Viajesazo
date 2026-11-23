package com.viajesazo.turismo_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.viajesazo.turismo_backend.model.PropuestaTuristica;

public interface PropuestaRepository
		extends JpaRepository<PropuestaTuristica, Long>, JpaSpecificationExecutor<PropuestaTuristica> {

	List<PropuestaTuristica> findByPublicadorIdOrderByNombreAsc(Long publicadorId);

	/**
	 * Zonas (ciudad + localidad) distintas para alimentar el selector del catálogo. Se puede
	 * acotar a un publicador y, por defecto, no incluye propuestas canceladas.
	 */
	@Query("""
			SELECT DISTINCT p.ubicacion.ciudad, p.ubicacion.localidad
			FROM PropuestaTuristica p
			WHERE (:publicadorId IS NULL OR p.publicador.id = :publicadorId)
			  AND (:incluirCanceladas = TRUE OR p.estadoPropuesta.nombre <> 'CANCELADO')
			  AND p.ubicacion.ciudad IS NOT NULL
			ORDER BY p.ubicacion.ciudad ASC, p.ubicacion.localidad ASC
			""")
	List<Object[]> findDistinctZonas(@Param("publicadorId") Long publicadorId,
			@Param("incluirCanceladas") boolean incluirCanceladas);

}
