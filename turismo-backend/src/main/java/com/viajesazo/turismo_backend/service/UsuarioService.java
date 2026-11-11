package com.viajesazo.turismo_backend.service;

import java.nio.charset.StandardCharsets;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.request.BajaUsuarioRequest;
import com.viajesazo.turismo_backend.dto.request.UsuarioRequest;
import com.viajesazo.turismo_backend.dto.response.BajaUsuarioResponse;
import com.viajesazo.turismo_backend.dto.response.UsuarioResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ConfirmationRequiredException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.UsuarioMapper;
import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.repository.ViajeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UsuarioService {

	/** Tope de BCrypt: el {@code BCryptPasswordEncoder} rechaza contraseñas de más de 72 bytes. */
	private static final int MAX_BYTES_CONTRASENA = 72;

	/**
	 * Viajes que la baja de usuario cancela. {@code EN_CURSO} queda afuera porque el dominio no
	 * permite cancelarlo ({@code EstadoViaje}: solo pasa a {@code FINALIZADO}); los terminales ya
	 * no están activos.
	 */
	private static final Set<EstadoViaje> VIAJES_CANCELABLES = EnumSet.of(EstadoViaje.BORRADOR,
			EstadoViaje.PLANIFICADO);

	private final UsuarioRepository usuarioRepository;
	private final UsuarioMapper mapper;
	private final PasswordEncoder passwordEncoder;
	private final ViajeRepository viajeRepository;

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

	/** Consulta de un usuario activo. Uno dado de baja responde 404, como si no existiera (CA4). */
	@Transactional(readOnly = true)
	public UsuarioResponse findById(Long id) {
		return mapper.toResponse(getActiveOrThrow(id));
	}

	/**
	 * Baja lógica de la cuenta. El orden de los chequeos es parte del contrato:
	 * <ol>
	 * <li>usuario activo, si no 404 (CA4: una cuenta dada de baja no existe);</li>
	 * <li>confirmación explícita, si no 409 (CA1), igual que la eliminación de paradas del circuito;</li>
	 * <li>contraseña correcta, si no 400 (CA2).</li>
	 * </ol>
	 * Recién entonces marca la cuenta como inactiva (CA3) y cancela sus viajes activos (CA5), todo
	 * en la misma transacción: si falla una cancelación, la cuenta no queda dada de baja a medias.
	 *
	 * <p>Los viajes se asocian por email porque {@code Viaje.usuario} todavía es un {@code String}
	 * sin FK (ver la deuda en AGENTS.md).
	 */
	@Transactional
	public BajaUsuarioResponse darDeBaja(Long id, BajaUsuarioRequest request, boolean confirmar) {
		Usuario usuario = getActiveOrThrow(id);
		if (!confirmar) {
			throw new ConfirmationRequiredException(
					"la baja de la cuenta requiere confirmación; confirmá con confirmar=true");
		}
		if (!passwordEncoder.matches(request.contrasena(), usuario.getContrasena())) {
			throw new BusinessRuleException("la contraseña es incorrecta");
		}

		usuario.darDeBaja();
		usuarioRepository.save(usuario);

		List<Viaje> viajes = viajeRepository.findByUsuarioAndEstadoIn(usuario.getEmail(), VIAJES_CANCELABLES);
		viajes.forEach(Viaje::cancelar);
		viajeRepository.saveAll(viajes);

		return new BajaUsuarioResponse(usuario.getId(), "la cuenta se dio de baja correctamente", viajes.size());
	}

	private Usuario getActiveOrThrow(Long id) {
		return usuarioRepository.findByIdAndActivoTrue(id)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el usuario con id " + id));
	}

}
