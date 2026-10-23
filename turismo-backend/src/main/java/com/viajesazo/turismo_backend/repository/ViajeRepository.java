package com.viajesazo.turismo_backend.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.Viaje;

public interface ViajeRepository extends JpaRepository<Viaje, Long> {

    /**
     * Listado de viajes activos (todo lo que no sea borrador ni cancelado) de un turista.
     */
    Page<Viaje> findByUsuarioAndEstadoNotInOrderByFechaInicioAsc(String usuario,
            Collection<EstadoViaje> estados, Pageable pageable);

    /**
     * Listado de viajes de un turista cuyo estado está permitido, ordenados por fecha de inicio.
     */
    Page<Viaje> findByUsuarioAndEstadoInOrderByFechaInicioAsc(String usuario,
            Collection<EstadoViaje> estados, Pageable pageable);

    /**
     * Detalle y modificación de un viaje no borrador y no cancelado.
     */
    Optional<Viaje> findByIdAndEstadoNotIn(Long id, Collection<EstadoViaje> estados);

    /**
     * Listado de borradores de un turista, del más reciente al más antiguo.
     */
    Page<Viaje> findByUsuarioAndEstadoOrderByIdDesc(String usuario, EstadoViaje estado,
            Pageable pageable);

    /**
     * Detalle de un borrador por id y estado (dueño validado en service).
     */
    Optional<Viaje> findByIdAndEstado(Long id, EstadoViaje estado);

    /**
     * Detalle/edición de un borrador, validando a su dueño.
     */
    Optional<Viaje> findByIdAndUsuarioAndEstado(Long id, String usuario, EstadoViaje estado);

    /**
     * Viajes candidatos a transiciones automáticas por fecha.
     */
    List<Viaje> findByEstadoIn(Collection<EstadoViaje> estados);

}