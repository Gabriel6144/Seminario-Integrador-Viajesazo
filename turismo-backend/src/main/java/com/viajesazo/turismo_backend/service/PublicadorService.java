package com.viajesazo.turismo_backend.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.request.PublicadorRequest;
import com.viajesazo.turismo_backend.dto.response.PublicadorResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.PublicadorMapper;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.repository.PublicadorRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PublicadorService {

	private final PublicadorRepository publicadorRepository;
	private final PublicadorMapper mapper;

	/**
	 * Alta de publicador, con el email uniqueness verificado antes de escribir.
	 *
	 * <p>El pre-chequeo es lo que convierte un email repetido en un 400 con mensaje útil. No
	 * alcanza como garantía: dos altas simultáneas pueden pasar las dos el {@code existsByEmail} y
	 * sólo la segunda revienta la constraint. Esa carrera la cubre
	 * {@code GlobalExceptionHandler#handleIntegrityViolation}.
	 */
	@Transactional
	public PublicadorResponse create(PublicadorRequest request) {
		if (publicadorRepository.existsByEmail(request.email())) {
			throw new BusinessRuleException("ya existe un publicador con ese email");
		}
		return mapper.toResponse(publicadorRepository.save(mapper.toEntity(request)));
	}

	@Transactional(readOnly = true)
	public PublicadorResponse findById(Long id) {
		return mapper.toResponse(getOrThrow(id));
	}

	/**
	 * Listado completo de publicadores, paginado. Sin filtros ni 404: una colección vacía es una
	 * página vacía con 200, igual que en los eventos de un publicador.
	 */
	@Transactional(readOnly = true)
	public Page<PublicadorResponse> findAll(Pageable pageable) {
		return publicadorRepository.findAllByOrderByNombreAsc(pageable).map(mapper::toResponse);
	}

	private Publicador getOrThrow(Long id) {
		return publicadorRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el publicador con id " + id));
	}

}
