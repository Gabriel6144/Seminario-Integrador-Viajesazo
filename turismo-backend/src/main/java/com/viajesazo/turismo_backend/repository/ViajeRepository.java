package com.viajesazo.turismo_backend.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.Viaje;

public interface ViajeRepository extends JpaRepository<Viaje, Long> {

    /**
     * VZ-22: listado de viajes "activos" (todo lo que no fue dado de baja) de un turista.
     * El orden va en el nombre del método porque es parte del contrato de la API, no una
     * preferencia del cliente, igual que en {@code EventoRepository}.
     *
     * <p>Un viaje dado de baja lógica queda con {@code estado = CANCELADO}, así que se excluye
     * con {@code Not}. Los viajes sembrados sin estado quedarían fuera por el {@code NULL};
     * por eso el seed siempre setea {@code PLANIFICADO}.
     */
    Page<Viaje> findByUsuarioAndEstadoNotOrderByFechaInicioAsc(String usuario, EstadoViaje estado,
            Pageable pageable);

    /**
     * Detalle y modificación de un viaje activo. Un viaje con baja lógica no existe para la API
     * (VZ-23 CA2), así que se busca excluyendo {@code CANCELADO}.
     */
    Optional<Viaje> findByIdAndEstadoNot(Long id, EstadoViaje estado);

}
