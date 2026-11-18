package com.viajesazo.turismo_backend.service;

import java.time.Instant;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.request.ForgotPasswordRequest;
import com.viajesazo.turismo_backend.dto.request.LoginRequest;
import com.viajesazo.turismo_backend.dto.response.AuthTokenResponse;
import com.viajesazo.turismo_backend.dto.response.UsuarioResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.mapper.UsuarioMapper;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.security.JwtService;
import com.viajesazo.turismo_backend.security.PasswordResetMailer;
import com.viajesazo.turismo_backend.security.RefreshTokenService;
import com.viajesazo.turismo_backend.security.SecurityUtils;
import com.viajesazo.turismo_backend.security.UsuarioPrincipal;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

	private final UsuarioRepository usuarioRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final RefreshTokenService refreshTokenService;
	private final UsuarioMapper usuarioMapper;
	private final PasswordResetMailer passwordResetMailer;

	@Transactional
	public AuthLoginResult login(LoginRequest request, String userAgent, String ipAddress) {
		Usuario usuario = usuarioRepository.findByEmailAndActivoTrue(request.email())
				.orElseThrow(() -> new BusinessRuleException("email o contraseña incorrectos"));
		if (!passwordEncoder.matches(request.contrasena(), usuario.getContrasena())) {
			throw new BusinessRuleException("email o contraseña incorrectos");
		}
		return issueTokens(usuario, userAgent, ipAddress);
	}

	@Transactional
	public AuthLoginResult refresh(String rawRefreshToken, String userAgent, String ipAddress) {
		if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
			throw new BusinessRuleException("falta el refresh token");
		}
		RefreshTokenService.RotatedRefreshToken rotated = refreshTokenService.rotate(rawRefreshToken, userAgent,
				ipAddress);
		Usuario usuario = rotated.usuario();
		if (!usuario.isActivo()) {
			throw new BusinessRuleException("la cuenta está dada de baja");
		}
		return issueTokens(usuario, rotated.rawToken());
	}

	@Transactional
	public void logout(String rawRefreshToken) {
		if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
			refreshTokenService.revoke(rawRefreshToken);
		}
	}

	@Transactional(readOnly = true)
	public UsuarioResponse me() {
		Long id = SecurityUtils.currentUsuarioId();
		Usuario usuario = usuarioRepository.findByIdAndActivoTrue(id)
				.orElseThrow(() -> new BusinessRuleException("no hay un usuario autenticado"));
		return usuarioMapper.toResponse(usuario);
	}

	/**
	 * Solicitud de recuperación. Siempre termina sin error de negocio aunque el email
	 * no exista (anti-enumeración). Si hay usuario activo, dispara el hook de mail.
	 */
	@Transactional(readOnly = true)
	public void forgotPassword(ForgotPasswordRequest request) {
		String email = request.email() == null ? "" : request.email().trim().toLowerCase();
		usuarioRepository.findByEmailAndActivoTrue(email)
				.ifPresent(passwordResetMailer::sendResetInstructions);
	}

	private AuthLoginResult issueTokens(Usuario usuario, String userAgent, String ipAddress) {
		String refresh = refreshTokenService.create(usuario, userAgent, ipAddress);
		return issueTokens(usuario, refresh);
	}

	private AuthLoginResult issueTokens(Usuario usuario, String refreshRaw) {
		usuario.setUltimoAccesoEn(Instant.now());
		usuarioRepository.save(usuario);
		UsuarioPrincipal principal = UsuarioPrincipal.from(usuario);
		String access = jwtService.createAccessToken(principal);
		AuthTokenResponse body = new AuthTokenResponse(access, "Bearer",
				jwtService.getAccessTokenExpiresInSeconds(), usuarioMapper.toResponse(usuario));
		return new AuthLoginResult(body, refreshRaw);
	}

	public record AuthLoginResult(AuthTokenResponse body, String refreshTokenRaw) {
	}

}
