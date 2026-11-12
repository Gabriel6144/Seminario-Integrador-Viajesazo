package com.viajesazo.turismo_backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.viajesazo.turismo_backend.model.Actividad;

public interface ActividadRepository extends JpaRepository<Actividad, Long> {

	Page<Actividad> findAllByOrderByNombreAsc(Pageable pageable);
}
