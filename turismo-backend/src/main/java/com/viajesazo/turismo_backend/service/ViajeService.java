package com.viajesazo.turismo_backend.service;

import java.time.Clock;
import java.time.LocalDate;
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
import java.util.ArrayList;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ViajeService {

	private final ViajeRepository viajeRepository;
	private final ViajeMapper mapper;
	private final Clock clock;

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
		viaje.validarEditable();
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
		viaje.cancelar();
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
		viaje.planificar(clock);
		viaje.setPasoActual(8);
		return mapper.toResponse(viajeRepository.save(viaje));
	}

	/** Baja lógica de un borrador: pasa a CANCELADO y deja de listarse. */
	@Transactional
	public void deleteDraft(Long id) {
		Viaje viaje = viajeRepository.findByIdAndEstado(id, EstadoViaje.BORRADOR)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el borrador con id " + id));
		viaje.cancelar();
		viajeRepository.save(viaje);
	}

	/**
	 * Materializa las transiciones automáticas por fecha: PLANIFICADO → EN_CURSO al
	 * comenzar el viaje y EN_CURSO → FINALIZADO al terminar. Los borradores y los
	 * estados terminales no se tocan.
	 */
	@Transactional
	public void aplicarTransicionesAutomaticas() {
		LocalDate hoy = LocalDate.now(clock);
		for (Viaje viaje : viajeRepository.findByEstadoIn(
				List.of(EstadoViaje.PLANIFICADO, EstadoViaje.EN_CURSO))) {
			viaje.actualizarEstadoPorFechas(hoy);
		}
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

	/** VZ-22: listado de viajes permitidos del turista, paginado. */
	@Transactional(readOnly = true)
	public Page<ViajeResponse> findAll(String usuario, Pageable pageable) {
		return viajeRepository
				.findByUsuarioAndEstadoInOrderByFechaInicioAsc(usuario,
						List.of(EstadoViaje.BORRADOR, EstadoViaje.PLANIFICADO, EstadoViaje.EN_CURSO), pageable)
				.map(mapper::toResponse);
	}

	private Viaje getOrThrow(Long id) {
		return viajeRepository
				.findByIdAndEstadoNotIn(id, List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO))
				.orElseThrow(() -> new ResourceNotFoundException("No existe el viaje con id " + id));
	}

	// VZ-22: listado de viajes permitidos del turista filtrado por estado, paginado.
	@Transactional(readOnly = true)
	public Page<ViajeResponse> findByEstado(String usuario, String estado, Pageable pageable) {
		EstadoViaje estadoEnum;
		try {
			estadoEnum = EstadoViaje.valueOf(estado);
		} catch (IllegalArgumentException e) {
			throw new BusinessRuleException("Estado inválido: " + estado);
		}
		return findByEstadoEnums(usuario, List.of(estadoEnum), pageable);
	}

	@Transactional(readOnly = true)
	public Page<ViajeResponse> findByEstados(String usuario, List<String> estados, Pageable pageable) {
		List<EstadoViaje> estadosEnum = estados.stream().map(this::parseEstado).toList();
		return findByEstadoEnums(usuario, estadosEnum, pageable);
	}

	private Page<ViajeResponse> findByEstadoEnums(String usuario, List<EstadoViaje> estados,
			Pageable pageable) {
		return viajeRepository
				.findByUsuarioAndEstadoInOrderByFechaInicioAsc(usuario, estados, pageable)
				.map(mapper::toResponse);
	}

	private EstadoViaje parseEstado(String estado) {
		try {
			EstadoViaje estadoEnum = EstadoViaje.valueOf(estado);
			if (estadoEnum == EstadoViaje.CANCELADO || estadoEnum == EstadoViaje.FINALIZADO) {
				throw new BusinessRuleException("Estado no permitido para el listado: " + estado);
			}
			return estadoEnum;
		} catch (IllegalArgumentException e) {
			throw new BusinessRuleException("Estado inválido: " + estado);
		}
	}

	private void validateRange(ViajeRequest request) {
		if (request.fechaFin().isBefore(request.fechaInicio())) {
			throw new BusinessRuleException("la fecha de finalización no puede ser anterior a la de inicio");
		}
	}

}
