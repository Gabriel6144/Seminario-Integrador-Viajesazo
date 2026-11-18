package com.viajesazo.turismo_backend.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.response.PropuestaInscriptosResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.model.PropuestaTuristica;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.repository.CircuitoItemRepository;
import com.viajesazo.turismo_backend.repository.PropuestaRepository;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.security.SecurityUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InscriptosService {

	private final UsuarioRepository usuarioRepository;
	private final PropuestaRepository propuestaRepository;
	private final CircuitoItemRepository circuitoItemRepository;

	@Transactional(readOnly = true)
	public List<PropuestaInscriptosResponse> listarPropias() {
		Long usuarioId = SecurityUtils.currentUsuarioId();
		Usuario usuario = usuarioRepository.findByIdAndActivoTrue(usuarioId)
				.orElseThrow(() -> new BusinessRuleException("no hay un usuario autenticado"));
		if (usuario.getPublicador() == null) {
			throw new BusinessRuleException("el usuario no está vinculado a un publicador");
		}
		Long publicadorId = usuario.getPublicador().getId();

		List<PropuestaInscriptosResponse> result = new ArrayList<>();
		for (PropuestaTuristica propuesta : propuestaRepository.findByPublicadorIdOrderByNombreAsc(publicadorId)) {
			long inscriptos = circuitoItemRepository.countInscriptosByPropuestaId(propuesta.getId());
			result.add(new PropuestaInscriptosResponse(
					propuesta.getId(),
					propuesta.getNombre(),
					propuesta.getTipo().name(),
					inscriptos));
		}
		result.sort(Comparator
				.comparingLong(PropuestaInscriptosResponse::inscriptos)
				.reversed()
				.thenComparing(PropuestaInscriptosResponse::nombre));
		return result;
	}

}
