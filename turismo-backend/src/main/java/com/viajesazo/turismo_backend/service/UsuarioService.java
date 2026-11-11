package com.viajesazo.turismo_backend.service;

import java.nio.charset.StandardCharsets;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.request.UsuarioRequest;
import com.viajesazo.turismo_backend.dto.response.UsuarioResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.UsuarioMapper;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UsuarioService {

	/** Tope de BCrypt: el {@code BCryptPasswordEncoder} rechaza contraseñas de más de 72 bytes. */
	private static final int MAX_BYTES_CONTRASENA = 72;

	private final UsuarioRepository usuarioRepository;
	private final UsuarioMapper mapper;
	private final PasswordEncoder passwordEncoder;

	/**
	 * Registro de usuario con la unicidad del email verificada antes de escribir y la contraseña
	 * guardada como hash. Dos altas simultáneas pueden pasar las dos el pre-chequeo; esa carrera la
	 * cubre {@code GlobalExceptionHandler#handleIntegrityViolation}.
	 */
	@Transactional
	public UsuarioResponse create(UsuarioRequest request) {
		// @Size cuenta caracteres, pero BCrypt limita bytes: con tildes o ñ (2 bytes en UTF-8) una
		// contraseña de menos de 72 caracteres puede pasar la validación y hacer que encode lance
		// IllegalArgumentException, que terminaría en un 500.
		if (request.contrasena().getBytes(StandardCharsets.UTF_8).length > MAX_BYTES_CONTRASENA) {
			throw new BusinessRuleException(
					"la contraseña es demasiado larga: las letras con tilde o ñ ocupan el doble");
		}
		if (usuarioRepository.existsByEmail(request.email())) {
			throw new BusinessRuleException("ya existe un usuario con ese email");
		}
		Usuario usuario = mapper.toEntity(request);
		usuario.setContrasena(passwordEncoder.encode(request.contrasena()));
		return mapper.toResponse(usuarioRepository.save(usuario));
	}

	@Transactional(readOnly = true)
	public UsuarioResponse findById(Long id) {
		return usuarioRepository.findById(id)
				.map(mapper::toResponse)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el usuario con id " + id));
	}

}
