package com.viajesazo.turismo_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.viajesazo.turismo_backend.model.CircuitoItem;

public interface CircuitoItemRepository extends JpaRepository<CircuitoItem, Long> {

	/**
	 * Conteo de usuarios distintos cuya alternativa seleccionada del circuito incluye la propuesta
	 * y esa propuesta tiene publicador (regla de inscripción automática).
	 * <p>
	 * El conteo se arma en el momento con las paradas actuales del circuito confirmado: si el
	 * turista sustituye o elimina una parada, esa inscripción deja de contar sola. Un viaje dado de
	 * baja (CANCELADO) tampoco cuenta, ni acá ni en las otras dos consultas.
	 */
	@Query("""
			SELECT i.propuestaId, COUNT(DISTINCT v.usuario.id)
			FROM CircuitoItem i
			JOIN i.alternativa a
			JOIN a.circuito c
			JOIN c.viaje v
			JOIN PropuestaTuristica p ON p.id = i.propuestaId
			WHERE c.estrategiaSeleccionada IS NOT NULL
			  AND a.estrategia = c.estrategiaSeleccionada
			  AND v.estado <> com.viajesazo.turismo_backend.model.EstadoViaje.CANCELADO
			  AND p.publicador IS NOT NULL
			GROUP BY i.propuestaId
			ORDER BY COUNT(DISTINCT v.usuario.id) DESC, i.propuestaId ASC
			""")
	List<Object[]> countInscriptosGroupedByPropuesta();

	@Query("""
			SELECT COUNT(DISTINCT v.usuario.id)
			FROM CircuitoItem i
			JOIN i.alternativa a
			JOIN a.circuito c
			JOIN c.viaje v
			JOIN PropuestaTuristica p ON p.id = i.propuestaId
			WHERE c.estrategiaSeleccionada IS NOT NULL
			  AND a.estrategia = c.estrategiaSeleccionada
			  AND v.estado <> com.viajesazo.turismo_backend.model.EstadoViaje.CANCELADO
			  AND i.propuestaId = :propuestaId
			  AND p.publicador IS NOT NULL
			""")
	long countInscriptosByPropuestaId(@Param("propuestaId") Long propuestaId);

	@Query("""
			SELECT DISTINCT v.usuario.id
			FROM CircuitoItem i
			JOIN i.alternativa a
			JOIN a.circuito c
			JOIN c.viaje v
			JOIN PropuestaTuristica p ON p.id = i.propuestaId
			WHERE c.estrategiaSeleccionada IS NOT NULL
			  AND a.estrategia = c.estrategiaSeleccionada
			  AND v.estado <> com.viajesazo.turismo_backend.model.EstadoViaje.CANCELADO
			  AND i.propuestaId = :propuestaId
			  AND p.publicador IS NOT NULL
			""")
	List<Long> findUsuarioIdsInscriptosByPropuestaId(@Param("propuestaId") Long propuestaId);

}
