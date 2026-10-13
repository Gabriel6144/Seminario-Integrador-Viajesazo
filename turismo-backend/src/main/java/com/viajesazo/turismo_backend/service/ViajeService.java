package com.viajesazo.turismo_backend.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.request.ViajeRequest;
import com.viajesazo.turismo_backend.dto.response.ViajeResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.ViajeMapper;
import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.repository.ViajeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ViajeService {

	private final ViajeRepository viajeRepository;
	private final ViajeMapper mapper;

	/** VZ-19: registra el viaje. Nace {@code PLANIFICADO} y asociado a su turista. */
	@Transactional
	public ViajeResponse create(ViajeRequest request) {
		validateRange(request);
		Viaje viaje = mapper.toEntity(request);
		viaje.setEstado(EstadoViaje.PLANIFICADO);
		return mapper.toResponse(viajeRepository.save(viaje));
	}

	/** VZ-21: modifica una plantilla activa. Un viaje dado de baja responde 404. */
	@Transactional
	public ViajeResponse update(Long id, ViajeRequest request) {
		validateRange(request);
		Viaje viaje = getOrThrow(id);
		mapper.updateEntity(request, viaje);
		mapper.updateUbicacion(request.ubicacion(), viaje.getZonaInteres());
		return mapper.toResponse(viajeRepository.save(viaje));
	}

	/**
	 * VZ-23: baja lógica. En vez de borrar, marca el viaje como {@code CANCELADO}; el listado y
	 * el detalle solo ven activos, así que deja de estar disponible.
	 */
	@Transactional
	public void delete(Long id) {
		Viaje viaje = getOrThrow(id);
		viaje.setEstado(EstadoViaje.CANCELADO);
		viajeRepository.save(viaje);
	}

	/** Soporte de VZ-21: detalle para editar. Inactivos → 404. */
	@Transactional(readOnly = true)
	public ViajeResponse findById(Long id) {
		return mapper.toResponse(getOrThrow(id));
	}

	/** VZ-22: listado de viajes activos (no cancelados) del turista, paginado. */
	@Transactional(readOnly = true)
	public Page<ViajeResponse> findAll(String usuario, Pageable pageable) {
		return viajeRepository
				.findByUsuarioAndEstadoNotOrderByFechaInicioAsc(usuario, EstadoViaje.CANCELADO, pageable)
				.map(mapper::toResponse);
	}

	private Viaje getOrThrow(Long id) {
		return viajeRepository.findByIdAndEstadoNot(id, EstadoViaje.CANCELADO)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el viaje con id " + id));
	}

	private void validateRange(ViajeRequest request) {
		if (request.fechaFin().isBefore(request.fechaInicio())) {
			throw new BusinessRuleException("la fecha de finalización no puede ser anterior a la de inicio");
		}
	}

}
