package com.viajesazo.turismo_backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.viajesazo.turismo_backend.model.Circuito;

public interface CircuitoRepository extends JpaRepository<Circuito, Long> {
    Optional<Circuito> findByViajeId(Long viajeId);
}
