package com.viajesazo.turismo_backend.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.request.ViajeBorradorRequest;
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

	/** Guarda (crea) un borrador parcial. */
	@Transactional
	public ViajeResponse saveDraft(ViajeBorradorRequest request) {
		validateDraftRange(request);
		Viaje viaje = mapper.toEntity(request);
		viaje.setEstado(EstadoViaje.BORRADOR);
		if (viaje.getInteresesCategoria() == null) {
			viaje.setInteresesCategoria(new ArrayList<>());
		}
		return mapper.toResponse(viajeRepository.save(viaje));
	}

	/** Actualiza un borrador existente, aplicando solo campos no nulos. */
	@Transactional
	public ViajeResponse updateDraft(Long id, ViajeBorradorRequest request) {
		validateDraftRange(request);
		Viaje viaje = viajeRepository.findByIdAndUsuarioAndEstado(id, request.usuario(), EstadoViaje.BORRADOR)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el borrador con id " + id));
		mapper.updateEntity(request, viaje);
		if (request.ubicacion() != null) {
			if (viaje.getZonaInteres() == null) {
				viaje.setZonaInteres(mapper.toUbicacionEntity(request.ubicacion()));
			} else {
				mapper.updateUbicacion(request.ubicacion(), viaje.getZonaInteres());
			}
		}
		if (request.interesesCategoria() != null) {
			viaje.setInteresesCategoria(new ArrayList<>(request.interesesCategoria()));
		}
		return mapper.toResponse(viajeRepository.save(viaje));
	}

	/** Listado de borradores del turista, paginado. */
	@Transactional(readOnly = true)
	public Page<ViajeResponse> listDrafts(String usuario, Pageable pageable) {
		return viajeRepository.findByUsuarioAndEstadoOrderByIdDesc(usuario, EstadoViaje.BORRADOR, pageable)
				.map(mapper::toResponse);
	}

	/** Recupera un borrador por id para continuar su planificación. */
	@Transactional(readOnly = true)
	public ViajeResponse findDraftById(Long id) {
		Viaje viaje = viajeRepository.findByIdAndEstado(id, EstadoViaje.BORRADOR)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el borrador con id " + id));
		return mapper.toResponse(viaje);
	}

	/** Completa el borrador: valida obligatorios y pasa a PLANIFICADO. */
	@Transactional
	public ViajeResponse completeDraft(Long id) {
		Viaje viaje = viajeRepository.findByIdAndEstado(id, EstadoViaje.BORRADOR)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el borrador con id " + id));
		validateCompleteness(viaje);
		viaje.setEstado(EstadoViaje.PLANIFICADO);
		viaje.setPasoActual(8);
		return mapper.toResponse(viajeRepository.save(viaje));
	}

	/** Baja física de un borrador. */
	@Transactional
	public void deleteDraft(Long id) {
		Viaje viaje = viajeRepository.findByIdAndEstado(id, EstadoViaje.BORRADOR)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el borrador con id " + id));
		viajeRepository.delete(viaje);
	}

	private void validateDraftRange(ViajeBorradorRequest request) {
		if (request.fechaInicio() != null && request.fechaFin() != null
				&& request.fechaFin().isBefore(request.fechaInicio())) {
			throw new BusinessRuleException("la fecha de finalización no puede ser anterior a la de inicio");
		}
		if (request.rangoInteresKm() != null && request.rangoInteresKm() <= 0) {
			throw new BusinessRuleException("El rango de interés debe ser mayor a cero");
		}
	}

	private void validateCompleteness(Viaje viaje) {
		if (viaje.getNombre() == null || viaje.getNombre().isBlank()) {
			throw new BusinessRuleException("El nombre del viaje no puede estar vacío");
		}
		if (viaje.getZonaInteres() == null) {
			throw new BusinessRuleException("La ubicación de interés no puede estar vacía");
		}
		if (viaje.getRangoInteresKm() == null || viaje.getRangoInteresKm() <= 0) {
			throw new BusinessRuleException("El rango de interés debe ser mayor a cero");
		}
		if (viaje.getFechaInicio() == null) {
			throw new BusinessRuleException("La fecha de inicio no puede estar vacía");
		}
		if (viaje.getFechaFin() == null) {
			throw new BusinessRuleException("La fecha de finalización no puede estar vacía");
		}
		if (viaje.getFechaFin().isBefore(viaje.getFechaInicio())) {
			throw new BusinessRuleException("la fecha de finalización no puede ser anterior a la de inicio");
		}
		if (viaje.getRitmo() == null) {
			throw new BusinessRuleException("El ritmo del viaje no puede estar vacío");
		}
		if (viaje.getUsuario() == null || viaje.getUsuario().isBlank()) {
			throw new BusinessRuleException("El turista no puede estar vacío");
		}
	}

	/** VZ-22: listado de viajes activos (no borradores ni cancelados) del turista, paginado. */
	@Transactional(readOnly = true)
	public Page<ViajeResponse> findAll(String usuario, Pageable pageable) {
		return viajeRepository
				.findByUsuarioAndEstadoNotInOrderByFechaInicioAsc(usuario,
						List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO), pageable)
				.map(mapper::toResponse);
	}

	private Viaje getOrThrow(Long id) {
		return viajeRepository
				.findByIdAndEstadoNotIn(id, List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO))
				.orElseThrow(() -> new ResourceNotFoundException("No existe el viaje con id " + id));
	}

	private void validateRange(ViajeRequest request) {
		if (request.fechaFin().isBefore(request.fechaInicio())) {
			throw new BusinessRuleException("la fecha de finalización no puede ser anterior a la de inicio");
		}
	}

}
