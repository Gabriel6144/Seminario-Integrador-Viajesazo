package com.viajesazo.turismo_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.viajesazo.turismo_backend.model.Notificacion;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

	List<Notificacion> findByUsuarioIdOrderByCreadaEnDesc(Long usuarioId);

	long countByUsuarioIdAndLeidaFalse(Long usuarioId);

	Optional<Notificacion> findByIdAndUsuarioId(Long id, Long usuarioId);
}
