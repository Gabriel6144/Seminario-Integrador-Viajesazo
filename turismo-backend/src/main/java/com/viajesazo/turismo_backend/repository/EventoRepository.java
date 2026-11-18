package com.viajesazo.turismo_backend.repository;

import java.time.LocalDate;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.viajesazo.turismo_backend.model.Evento;

public interface EventoRepository extends JpaRepository<Evento, Long> {

	/**
	 * Paginado. El orden va en el nombre de la Derived Query y no en el {@code Pageable}: el
	 * orden es parte del contrato de la API, no una preferencia del cliente que pueda cambiar.
	 * Por eso el service arma el {@code Pageable} sin {@code Sort}.
	 */
	Page<Evento> findByPublicadorIdOrderByFechaInicioAsc(Long publicadorId, Pageable pageable);

	/**
	 * Listado completo paginado. Mismo criterio de orden que la agenda: primero por fecha de
	 * inicio y, dentro del mismo día, por hora de inicio. Así un evento puntual queda en su día
	 * y no después de los de varios días.
	 */
	Page<Evento> findAllByOrderByFechaInicioAscHorarioInicioAsc(Pageable pageable);

	/**
	 * Agenda por solapamiento dentro de una ventana: entra todo evento que termine en
	 * {@code from} o después y empiece en {@code to} o antes.
	 *
	 * <p>No es igualdad de fechas, así que un evento que empezó antes de la ventana y sigue
	 * vigente aparece igual. Para la agenda semanal el service pasa {@code from} = hoy, no el
	 * lunes, para que los eventos ya terminados durante la semana queden afuera.
	 */
	@Query("SELECT e FROM Evento e WHERE e.fechaFin >= :from AND e.fechaInicio <= :to "
			+ "ORDER BY e.fechaInicio ASC, e.horarioInicio ASC")
	Page<Evento> findOverlapping(@Param("from") LocalDate from, @Param("to") LocalDate to,
			Pageable pageable);

	@Query("""
			SELECT e FROM Evento e
			WHERE e.publicador.id = :publicadorId
			ORDER BY e.fechaInicio ASC, e.nombre ASC
			""")
	java.util.List<Evento> findAllByPublicadorId(@Param("publicadorId") Long publicadorId);

	@Query("""
			SELECT COUNT(e) > 0 FROM Evento e
			WHERE e.publicador.id = :publicadorId
			  AND e.fechaFin >= :inicio
			  AND e.fechaInicio <= :fin
			  AND (:excludeId IS NULL OR e.id <> :excludeId)
			""")
	boolean existsOverlapping(@Param("publicadorId") Long publicadorId,
			@Param("inicio") LocalDate inicio,
			@Param("fin") LocalDate fin,
			@Param("excludeId") Long excludeId);

}
