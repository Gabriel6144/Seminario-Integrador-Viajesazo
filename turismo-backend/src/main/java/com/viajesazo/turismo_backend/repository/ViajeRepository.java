package com.viajesazo.turismo_backend.repository;

import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

//import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.Viaje;

public interface ViajeRepository extends JpaRepository<Viaje, Long> {
    // Orden por fecha inicio 
    Page<Viaje> findAllByOrderByFechaInicioAscFechaFinAsc(Pageable pageable);

    // Determina si un Viaje esta activo total o parcialmente dentro del rango consultado 
    @Query("SELECT e FROM Viaje e WHERE e.fechaFin >= :from AND e.fechaInicio <= :to "
			+ "ORDER BY e.fechaInicio ASC, e.fechaFin ASC")
    Page<Viaje> findOverlapping(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to,
			Pageable pageable);

}
