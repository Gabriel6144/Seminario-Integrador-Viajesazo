package com.viajesazo.turismo_backend.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.request.ViajeBorradorRequest;
import com.viajesazo.turismo_backend.dto.request.ViajeRequest;
import com.viajesazo.turismo_backend.dto.response.CircuitoResponse;
import com.viajesazo.turismo_backend.dto.response.ViajeResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.ViajeMapper;
import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.repository.ViajeRepository;
import com.viajesazo.turismo_backend.security.SecurityUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ViajeService {

	private final ViajeRepository viajeRepository;
	private final UsuarioRepository usuarioRepository;
	private final ViajeMapper mapper;
	private final Clock clock;
	private final CircuitoService circuitoService;

	/** VZ-19: registra el viaje. Nace {@code PLANIFICADO} y asociado al turista autenticado. */
	@Transactional
	public ViajeResponse create(ViajeRequest request) {
		validateCreationDate(request);
		Viaje viaje = mapper.toEntity(request);
		viaje.setUsuario(currentUsuario());
		viaje.setEstado(EstadoViaje.PLANIFICADO);
		if (viaje.getCreadoEn() == null) {
			viaje.setCreadoEn(Instant.now(clock));
		}
		return withCircuit(mapper.toResponse(viajeRepository.save(viaje)), viaje.getId());
	}

	/** VZ-21: modifica una plantilla activa. Un viaje dado de baja o ajeno responde 404. */
	@Transactional
	public ViajeResponse update(Long id, ViajeRequest request) {
		Viaje viaje = getOwnedOrThrow(id);
		viaje.validarEditable();

		validateUpdateDate(request, viaje);

		mapper.updateEntity(request, viaje);
		mapper.updateUbicacion(request.ubicacion(), viaje.getZonaInteres());
		return withCircuit(mapper.toResponse(viajeRepository.save(viaje)), viaje.getId());
	}

	/**
	 * VZ-23: baja lógica. En vez de borrar, marca el viaje como {@code CANCELADO}; el listado y
	 * el detalle solo ven activos, así que deja de estar disponible.
	 */
	@Transactional
	public void delete(Long id) {
		Viaje viaje = getOwnedOrThrow(id);
		viaje.cancelar();
		viajeRepository.save(viaje);
	}

	/** Soporte de VZ-21: detalle para editar. Inactivos o ajenos → 404. */
	@Transactional(readOnly = true)
	public ViajeResponse findById(Long id) {
		return withCircuit(mapper.toResponse(getOwnedOrThrow(id)), id);
	}

	/** Guarda (crea) un borrador parcial del turista autenticado. */
	@Transactional
	public ViajeResponse saveDraft(ViajeBorradorRequest request) {
		Viaje viaje = mapper.toEntity(request);
		viaje.setUsuario(currentUsuario());
		validateDraftRange(request, viaje);
		viaje.setEstado(EstadoViaje.BORRADOR);
		if (viaje.getCreadoEn() == null) {
			viaje.setCreadoEn(Instant.now(clock));
		}
		if (viaje.getInteresesCategoria() == null) {
			viaje.setInteresesCategoria(new ArrayList<>());
		}
		return withCircuit(mapper.toResponse(viajeRepository.save(viaje)), viaje.getId());
	}

	/** Actualiza un borrador existente, aplicando solo campos no nulos. */
	@Transactional
	public ViajeResponse updateDraft(Long id, ViajeBorradorRequest request) {
		Viaje viaje = viajeRepository
				.findByIdAndUsuarioAndEstado(id, currentUsuario(), EstadoViaje.BORRADOR)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el borrador con id " + id));
		mapper.updateEntity(request, viaje);
		validateDraftRange(request, viaje);
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
		if (request.diasPlan() != null) {
			viaje.setDiasPlan(new ArrayList<>(request.diasPlan().stream().map(mapper::toDiaPlan).toList()));
		}
		return withCircuit(mapper.toResponse(viajeRepository.save(viaje)), viaje.getId());
	}

	/** Listado de borradores del turista autenticado, paginado. */
	@Transactional(readOnly = true)
	public Page<ViajeResponse> listDrafts(Pageable pageable) {
		return viajeRepository
				.findByUsuarioAndEstadoOrderByIdDesc(currentUsuario(), EstadoViaje.BORRADOR, pageable)
				.map(mapper::toResponse);
	}

	/** Recupera un borrador por id para continuar su planificación. */
	@Transactional(readOnly = true)
	public ViajeResponse findDraftById(Long id) {
		Viaje viaje = viajeRepository.findByIdAndEstado(id, EstadoViaje.BORRADOR)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el borrador con id " + id));
		assertOwner(viaje);
		return withCircuit(mapper.toResponse(viaje), id);
	}

	/** Completa el borrador: valida obligatorios y pasa a PLANIFICADO. */
	@Transactional
	public ViajeResponse completeDraft(Long id) {
		Viaje viaje = viajeRepository.findByIdAndEstado(id, EstadoViaje.BORRADOR)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el borrador con id " + id));
		assertOwner(viaje);
		viaje.planificar(clock);
		viaje.setPasoActual(8);
		return withCircuit(mapper.toResponse(viajeRepository.save(viaje)), id);
	}

	/** Baja lógica de un borrador: pasa a CANCELADO y deja de listarse. */
	@Transactional
	public void deleteDraft(Long id) {
		Viaje viaje = viajeRepository.findByIdAndEstado(id, EstadoViaje.BORRADOR)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el borrador con id " + id));
		assertOwner(viaje);
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

	private void validateCreationDate(ViajeRequest request) {
		if (request.fechaInicio().isBefore(LocalDate.now(clock))) {
			throw new BusinessRuleException("La fecha de inicio debe ser igual o posterior a la fecha actual");
		}

		if (request.fechaFin().isBefore(request.fechaInicio())) {
			throw new BusinessRuleException("La fecha de finalización no puede ser anterior a la de inicio");
		}

	}

	private void validateUpdateDate(ViajeRequest request, Viaje viaje) {
		if (request.fechaFin().isBefore(request.fechaInicio())) {
			throw new BusinessRuleException("La nueva fecha de finalización no puede ser anterior a la de inicio");
		}
		if (!request.fechaInicio().equals(viaje.getFechaInicio())) {
			if (viaje.getFechaInicio().isBefore(LocalDate.now(clock))) {
				throw new BusinessRuleException("No se puede modificar la fecha de inicio de un viaje que ya comenzó");
			}
			if (request.fechaInicio().isBefore(LocalDate.now(clock))) {
				throw new BusinessRuleException("La nueva fecha de inicio no puede ser anterior a hoy");
			}
		}

		if (!request.fechaFin().equals(viaje.getFechaFin())) {
			if (request.fechaFin().isBefore(LocalDate.now(clock))) {
				throw new BusinessRuleException("La nueva fecha de finalizacion no puede ser anterior a hoy");
			}
			if (viaje.getFechaFin().isBefore(LocalDate.now(clock))) {
				throw new BusinessRuleException("La fecha de finalizacion no puede ser anterior a la fecha actual");
			}

		}
	}

	private void validateDraftRange(ViajeBorradorRequest request, Viaje viaje) {
		if (request.fechaInicio() == null || request.fechaFin() == null) {
			return;
		}
		if (request.fechaFin().isBefore(request.fechaInicio())) {
			throw new BusinessRuleException("La nueva fecha de finalización no puede ser anterior a la de inicio");
		}
		if (viaje.getFechaInicio() != null && !request.fechaInicio().equals(viaje.getFechaInicio())) {
			if (viaje.getFechaInicio().isBefore(LocalDate.now(clock))) {
				throw new BusinessRuleException("No se puede modificar la fecha de inicio de un viaje que ya comenzó");
			}
			if (request.fechaInicio().isBefore(LocalDate.now(clock))) {
				throw new BusinessRuleException("La nueva fecha de inicio no puede ser anterior a hoy");
			}
		}
		if (viaje.getFechaFin() != null && !request.fechaFin().equals(viaje.getFechaFin())) {
			if (request.fechaFin().isBefore(LocalDate.now(clock))) {
				throw new BusinessRuleException("La nueva fecha de finalizacion no puede ser anterior a hoy");
			}
			if (viaje.getFechaFin().isBefore(LocalDate.now(clock))) {
				throw new BusinessRuleException("La nueva fecha de finalizacion no puede ser anterior a la fecha de inicio");
			}
		}
	}

	/** VZ-22: listado de viajes permitidos del turista autenticado, paginado. */
	@Transactional(readOnly = true)
	public Page<ViajeResponse> findAll(Pageable pageable) {
		return viajeRepository
				.findByUsuarioAndEstadoInOrderByFechaInicioAsc(currentUsuario(),
						List.of(EstadoViaje.BORRADOR, EstadoViaje.PLANIFICADO, EstadoViaje.EN_CURSO), pageable)
				.map(mapper::toResponse);
	}

	private Viaje getOwnedOrThrow(Long id) {
		Viaje viaje = viajeRepository
				.findByIdAndEstadoNotIn(id, List.of(EstadoViaje.BORRADOR, EstadoViaje.CANCELADO))
				.orElseThrow(() -> new ResourceNotFoundException("No existe el viaje con id " + id));
		assertOwner(viaje);
		return viaje;
	}

	@Transactional(readOnly = true)
	public Page<ViajeResponse> findByEstado(String estado, Pageable pageable) {
		EstadoViaje estadoEnum;
		try {
			estadoEnum = EstadoViaje.valueOf(estado);
		} catch (IllegalArgumentException e) {
			throw new BusinessRuleException("Estado inválido: " + estado);
		}
		return findByEstadoEnums(List.of(estadoEnum), pageable);
	}

	@Transactional(readOnly = true)
	public Page<ViajeResponse> findByEstados(List<String> estados, Pageable pageable) {
		List<EstadoViaje> estadosEnum = estados.stream().map(this::parseEstado).toList();
		return findByEstadoEnums(estadosEnum, pageable);
	}

	private Page<ViajeResponse> findByEstadoEnums(List<EstadoViaje> estados, Pageable pageable) {
		return viajeRepository
				.findByUsuarioAndEstadoInOrderByFechaInicioAsc(currentUsuario(), estados, pageable)
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

	private ViajeResponse withCircuit(ViajeResponse response, Long viajeId) {
		CircuitoResponse circuit = circuitoService.selected(viajeId);
		return new ViajeResponse(response.id(), response.nombre(), response.ubicacion(),
				response.rangoInteresKm(), response.fechaInicio(), response.fechaFin(), response.ritmo(),
				response.interesesCategoria(), response.diasPlan(), response.estado(), response.pasoActual(),
				response.usuarioId(), response.usuarioEmail(), circuit);
	}

	private Usuario currentUsuario() {
		Long id = SecurityUtils.currentUsuarioId();
		return usuarioRepository.findByIdAndActivoTrue(id)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el usuario con id " + id));
	}

	private void assertOwner(Viaje viaje) {
		Long currentId = SecurityUtils.currentUsuarioId();
		if (viaje.getUsuario() == null || !viaje.getUsuario().getId().equals(currentId)) {
			throw new ResourceNotFoundException("No existe el viaje con id " + viaje.getId());
		}
	}

}
