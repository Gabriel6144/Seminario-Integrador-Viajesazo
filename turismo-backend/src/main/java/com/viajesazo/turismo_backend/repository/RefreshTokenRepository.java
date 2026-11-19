package com.viajesazo.turismo_backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.viajesazo.turismo_backend.model.RefreshToken;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

	Optional<RefreshToken> findByTokenHashAndRevokedFalse(String tokenHash);

	@Modifying(clearAutomatically = true)
	@Query("update RefreshToken r set r.revoked = true where r.usuario.id = :usuarioId and r.revoked = false")
	int revokeAllActiveForUsuario(@Param("usuarioId") Long usuarioId);

}
