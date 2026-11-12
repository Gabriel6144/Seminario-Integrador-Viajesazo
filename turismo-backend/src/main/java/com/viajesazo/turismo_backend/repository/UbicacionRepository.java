package com.viajesazo.turismo_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.viajesazo.turismo_backend.model.Ubicacion;

public interface UbicacionRepository extends JpaRepository<Ubicacion, Long> {
}
