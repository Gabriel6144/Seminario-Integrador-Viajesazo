package com.viajesazo.turismo_backend.service;

import java.nio.charset.StandardCharsets;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
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
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.repository.PublicadorRepository;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.repository.ViajeRepository;
import com.viajesazo.turismo_backend.security.RefreshTokenService;
import com.viajesazo.turismo_backend.security.SecurityUtils;
import com.viajesazo.turismo_backend.security.UsuarioPrincipal;

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
	private final RefreshTokenService refreshTokenService;
	private final PublicadorRepository publicadorRepository;

	/**
	 * Registro público: el cliente elige {@link Rol#TURISTA} o {@link Rol#PUBLICADOR}. Una cuenta
	 * tiene exactamente un rol. Si elige PUBLICADOR se crea y vincula un {@link Publicador} con
	 * los datos de la cuenta.
	 */
	@Transactional
	public UsuarioResponse create(UsuarioRequest request) {
		if (request.contrasena().getBytes(StandardCharsets.UTF_8).length > MAX_BYTES_CONTRASENA) {
			throw new BusinessRuleException(
					"la contraseña es demasiado larga: las letras con tilde o ñ ocupan el doble");
		}
		if (request.rol() == null
				|| (request.rol() != Rol.TURISTA && request.rol() != Rol.PUBLICADOR)) {
			throw new BusinessRuleException(
					"el registro público solo admite los roles TURISTA o PUBLICADOR");
		}
		if (usuarioRepository.existsByEmail(request.email())) {
			throw new BusinessRuleException("ya existe un usuario con ese email");
		}
		Usuario usuario = mapper.toEntity(request);
		usuario.setContrasena(passwordEncoder.encode(request.contrasena()));
		usuario.setRoles(new HashSet<>(Set.of(request.rol())));

		if (request.rol() == Rol.PUBLICADOR) {
			if (publicadorRepository.existsByEmail(request.email())) {
				throw new BusinessRuleException("ya existe un publicador con ese email");
			}
			Publicador publicador = Publicador.builder()
					.nombre(request.nombre())
					.email(request.email())
					.telefono(request.telefono())
					.build();
			publicador = publicadorRepository.save(publicador);
			usuario.setPublicador(publicador);
		}

		return mapper.toResponse(usuarioRepository.save(usuario));
	}

	/**
	 * Consulta de un usuario activo. Solo el propio o un administrador. Uno dado de baja
	 * responde 404 (CA4).
	 */
	@Transactional(readOnly = true)
	public UsuarioResponse findById(Long id) {
		Usuario usuario = getActiveOrThrow(id);
		assertSelfOrAdmin(id);
		return mapper.toResponse(usuario);
	}

	/** Listado admin de usuarios activos, con búsqueda y filtro de rol. */
	@Transactional(readOnly = true)
	public Page<UsuarioResponse> search(String q, Rol rol, Pageable pageable) {
		String query = q == null ? "" : q.trim();
		return usuarioRepository.searchActivos(query, rol, pageable).map(mapper::toResponse);
	}

	/**
	 * Baja lógica de la cuenta. Solo el propio usuario. Cancela viajes
	 * {@code BORRADOR}/{@code PLANIFICADO} y revoca refresh tokens activos.
	 */
	@Transactional
	public BajaUsuarioResponse darDeBaja(Long id, BajaUsuarioRequest request, boolean confirmar) {
		assertSelf(id);
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

		List<Viaje> viajes = viajeRepository.findByUsuarioAndEstadoIn(usuario, VIAJES_CANCELABLES);
		viajes.forEach(Viaje::cancelar);
		viajeRepository.saveAll(viajes);

		refreshTokenService.revokeAllForUsuario(usuario.getId());

		return new BajaUsuarioResponse(usuario.getId(), "la cuenta se dio de baja correctamente", viajes.size());
	}

	/**
	 * Asigna el rol único de la cuenta. Si entra {@link Rol#PUBLICADOR} exige publicador
	 * vinculado; si sale, lo desvincula.
	 */
	@Transactional
	public UsuarioResponse assignRoles(Long id, Rol rol) {
		if (rol == null) {
			throw new BusinessRuleException("debe indicar el rol");
		}
		Usuario usuario = getActiveOrThrow(id);
		if (rol == Rol.PUBLICADOR && usuario.getPublicador() == null) {
			throw new BusinessRuleException(
					"para asignar el rol PUBLICADOR el usuario debe tener un publicador vinculado");
		}
		if (rol != Rol.PUBLICADOR && usuario.getPublicador() != null) {
			usuario.setPublicador(null);
		}
		usuario.setRoles(new HashSet<>(Set.of(rol)));
		return mapper.toResponse(usuarioRepository.save(usuario));
	}

	/**
	 * Vincula un publicador al usuario y deja el rol único en {@link Rol#PUBLICADOR}.
	 */
	@Transactional
	public UsuarioResponse linkPublicador(Long id, Long publicadorId) {
		Usuario usuario = getActiveOrThrow(id);
		Publicador publicador = publicadorRepository.findById(publicadorId)
				.orElseThrow(() -> new ResourceNotFoundException(
						"No existe el publicador con id " + publicadorId));
		if (usuarioRepository.existsByPublicadorId(publicadorId)
				&& (usuario.getPublicador() == null
						|| !usuario.getPublicador().getId().equals(publicadorId))) {
			throw new BusinessRuleException("ese publicador ya está vinculado a otro usuario");
		}
		usuario.setPublicador(publicador);
		usuario.setRoles(new HashSet<>(Set.of(Rol.PUBLICADOR)));
		return mapper.toResponse(usuarioRepository.save(usuario));
	}

	private Usuario getActiveOrThrow(Long id) {
		return usuarioRepository.findByIdAndActivoTrue(id)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el usuario con id " + id));
	}

	private void assertSelf(Long id) {
		if (!SecurityUtils.currentUsuarioId().equals(id)) {
			throw new AccessDeniedException("solo podés operar sobre tu propia cuenta");
		}
	}

	private void assertSelfOrAdmin(Long id) {
		UsuarioPrincipal principal = SecurityUtils.currentPrincipal();
		if (principal.getId().equals(id) || principal.hasRole(Rol.ADMINISTRADOR)) {
			return;
		}
		throw new AccessDeniedException("no tenés permiso para consultar ese usuario");
	}

}
