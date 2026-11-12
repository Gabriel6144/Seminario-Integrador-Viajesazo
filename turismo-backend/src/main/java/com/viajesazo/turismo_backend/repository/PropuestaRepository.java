package com.viajesazo.turismo_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.viajesazo.turismo_backend.model.PropuestaTuristica;

public interface PropuestaRepository
		extends JpaRepository<PropuestaTuristica, Long>, JpaSpecificationExecutor<PropuestaTuristica> {
}
