package com.viajesazo.turismo_backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.viajesazo.turismo_backend.model.EstadoPropuesta;

public interface EstadoPropuestaRepository extends JpaRepository<EstadoPropuesta, Long> {

	Optional<EstadoPropuesta> findByNombre(String nombre);
}
