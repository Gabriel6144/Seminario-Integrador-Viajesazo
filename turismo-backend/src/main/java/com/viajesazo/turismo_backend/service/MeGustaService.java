package com.viajesazo.turismo_backend.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.response.MeGustaResponse;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.model.MeGusta;
import com.viajesazo.turismo_backend.model.PropuestaTuristica;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.repository.MeGustaRepository;
import com.viajesazo.turismo_backend.repository.PropuestaRepository;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.security.SecurityUtils;
import com.viajesazo.turismo_backend.security.UsuarioPrincipal;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MeGustaService {

	private final MeGustaRepository meGustaRepository;
	private final PropuestaRepository propuestaRepository;
	private final UsuarioRepository usuarioRepository;

	@Transactional(readOnly = true)
	public MeGustaResponse estado(Long propuestaId) {
		PropuestaTuristica propuesta = getPropuestaOrThrow(propuestaId);
		long total = meGustaRepository.countByPropuestaId(propuesta.getId());
		UsuarioPrincipal principal = SecurityUtils.currentPrincipal();
		boolean meGusta = principal.hasRole(Rol.TURISTA)
				&& meGustaRepository.existsByUsuarioIdAndPropuestaId(principal.getId(), propuesta.getId());
		return new MeGustaResponse(meGusta, total);
	}

	@Transactional
	public MeGustaResponse darMeGusta(Long propuestaId) {
		UsuarioPrincipal principal = requireTurista();
		PropuestaTuristica propuesta = getPropuestaOrThrow(propuestaId);
		if (!meGustaRepository.existsByUsuarioIdAndPropuestaId(principal.getId(), propuesta.getId())) {
			Usuario usuario = usuarioRepository.findByIdAndActivoTrue(principal.getId())
					.orElseThrow(() -> new AccessDeniedException("no hay un usuario autenticado"));
			meGustaRepository.save(MeGusta.builder()
					.usuario(usuario)
					.propuesta(propuesta)
					.build());
		}
		return new MeGustaResponse(true, meGustaRepository.countByPropuestaId(propuesta.getId()));
	}

	@Transactional
	public MeGustaResponse quitarMeGusta(Long propuestaId) {
		UsuarioPrincipal principal = requireTurista();
		PropuestaTuristica propuesta = getPropuestaOrThrow(propuestaId);
		meGustaRepository.deleteByUsuarioIdAndPropuestaId(principal.getId(), propuesta.getId());
		return new MeGustaResponse(false, meGustaRepository.countByPropuestaId(propuesta.getId()));
	}

	private UsuarioPrincipal requireTurista() {
		UsuarioPrincipal principal = SecurityUtils.currentPrincipal();
		if (!principal.hasRole(Rol.TURISTA)) {
			throw new AccessDeniedException("solo un turista puede dar me gusta");
		}
		return principal;
	}

	private PropuestaTuristica getPropuestaOrThrow(Long propuestaId) {
		return propuestaRepository.findById(propuestaId)
				.orElseThrow(() -> new ResourceNotFoundException(
						"No existe la propuesta con id " + propuestaId));
	}
}
