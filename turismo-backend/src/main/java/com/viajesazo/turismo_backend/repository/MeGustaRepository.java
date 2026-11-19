package com.viajesazo.turismo_backend.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.viajesazo.turismo_backend.model.MeGusta;

public interface MeGustaRepository extends JpaRepository<MeGusta, Long> {

	boolean existsByUsuarioIdAndPropuestaId(Long usuarioId, Long propuestaId);

	Optional<MeGusta> findByUsuarioIdAndPropuestaId(Long usuarioId, Long propuestaId);

	long countByPropuestaId(Long propuestaId);

	void deleteByUsuarioIdAndPropuestaId(Long usuarioId, Long propuestaId);

	@Query("select m.propuesta.id from MeGusta m where m.usuario.id = :usuarioId")
	Set<Long> findPropuestaIdsByUsuarioId(@Param("usuarioId") Long usuarioId);

	@Query("select m.propuesta.id, count(m) from MeGusta m where m.propuesta.id in :ids group by m.propuesta.id")
	List<Object[]> countByPropuestaIdIn(@Param("ids") Collection<Long> ids);
}
