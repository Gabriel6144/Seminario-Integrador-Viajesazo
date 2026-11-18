package com.viajesazo.turismo_backend.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import com.viajesazo.turismo_backend.dto.request.ActividadRequest;
import com.viajesazo.turismo_backend.dto.request.ReprogramarEventoRequest;
import com.viajesazo.turismo_backend.dto.response.ActividadResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.ActividadMapper;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.EstadoPropuesta;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.repository.ActividadRepository;
import com.viajesazo.turismo_backend.repository.EstadoPropuestaRepository;
import com.viajesazo.turismo_backend.repository.PublicadorRepository;
import com.viajesazo.turismo_backend.repository.UbicacionRepository;
import com.viajesazo.turismo_backend.security.SecurityUtils;
import com.viajesazo.turismo_backend.security.UsuarioPrincipal;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ActividadService {

	private final ActividadRepository actividadRepository;
	private final PublicadorRepository publicadorRepository;
	private final EstadoPropuestaRepository estadoPropuestaRepository;
	private final UbicacionRepository ubicacionRepository;
	private final ActividadMapper mapper;
	private final GeocodingService geocodingService;
	private final Clock clock;

	@Transactional
	public ActividadResponse create(ActividadRequest request) {
		validateRange(request);
		Actividad actividad = mapper.toEntity(request);
		actividad.setTipoAcceso(request.tipoAcceso() == null ? TipoAcceso.GRATUITO : request.tipoAcceso());
		actividad.setEstadoPropuesta(getInitialState());
		Publicador publicador = resolvePublicadorForWrite(request.publicadorId(), null);
		actividad.setPublicador(publicador);
		applyUbicacion(actividad, request);
		actividad.validarInvariantes();
		return mapper.toResponse(actividadRepository.save(actividad));
	}

	@Transactional
	public ActividadResponse update(Long id, ActividadRequest request) {
		validateRange(request);
		Actividad actividad = getOrThrow(id);
		assertCanManage(actividad.getPublicador());
		actividad.validarEditable();
		mapper.updateEntity(request, actividad);
		if (request.tipoAcceso() != null) {
			actividad.setTipoAcceso(request.tipoAcceso());
		}
		Publicador publicador = resolvePublicadorForWrite(request.publicadorId(), actividad.getPublicador());
		actividad.setPublicador(publicador);
		applyUbicacion(actividad, request);
		actividad.validarInvariantes();
		return mapper.toResponse(actividadRepository.save(actividad));
	}

	/**
	 * Reprograma solo las fechas de la actividad, preservando la duración del rango.
	 * No geocodifica ni notifica (las notificaciones de reprogramación son de eventos).
	 */
	@Transactional
	public ActividadResponse reprogramar(Long id, ReprogramarEventoRequest request) {
		Actividad actividad = getOrThrow(id);
		assertCanManage(actividad.getPublicador());
		actividad.validarEditable();
		if (request.fechaInicio() == null) {
			throw new BusinessRuleException("la fecha de inicio es obligatoria");
		}
		LocalDate fechaAnteriorInicio = actividad.getFechaInicio();
		LocalDate fechaAnteriorFin = actividad.getFechaFin();
		long dias = ChronoUnit.DAYS.between(fechaAnteriorInicio, fechaAnteriorFin);
		LocalDate nuevaInicio = request.fechaInicio();
		LocalDate nuevaFin = nuevaInicio.plusDays(dias);
		// No se puede reprogramar a un día anterior a hoy (misma regla que el DnD del frontend).
		if (nuevaInicio.isBefore(LocalDate.now(clock))) {
			throw new BusinessRuleException("no se puede reprogramar a un día anterior a hoy");
		}
		actividad.setFechaInicio(nuevaInicio);
		actividad.setFechaFin(nuevaFin);
		actividad.validarInvariantes();
		return mapper.toResponse(actividadRepository.save(actividad));
	}

	@Transactional
	public void delete(Long id) {
		Actividad actividad = getOrThrow(id);
		assertCanManage(actividad.getPublicador());
		actividadRepository.delete(actividad);
	}

	@Transactional(readOnly = true)
	public ActividadResponse findById(Long id) {
		return mapper.toResponse(getOrThrow(id));
	}

	@Transactional(readOnly = true)
	public Page<ActividadResponse> findAll(Pageable pageable) {
		return actividadRepository.findAllByOrderByNombreAsc(pageable).map(mapper::toResponse);
	}

	private Actividad getOrThrow(Long id) {
		return actividadRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("No existe la actividad con id " + id));
	}

	private Publicador getPublicadorOrThrow(Long publicadorId) {
		return publicadorRepository.findById(publicadorId)
				.orElseThrow(() -> new ResourceNotFoundException(
						"No existe el publicador con id " + publicadorId));
	}

	private Publicador resolvePublicadorForWrite(Long requestedPublicadorId, Publicador existing) {
		UsuarioPrincipal principal = SecurityUtils.currentPrincipal();
		if (principal.hasRole(Rol.ADMINISTRADOR)) {
			return getPublicadorOrThrow(requestedPublicadorId);
		}
		if (!principal.hasRole(Rol.PUBLICADOR) || principal.getPublicadorId() == null) {
			throw new BusinessRuleException("solo un publicador o administrador puede gestionar actividades");
		}
		if (existing != null && !existing.getId().equals(principal.getPublicadorId())) {
			throw new BusinessRuleException("no podés gestionar actividades de otro publicador");
		}
		return getPublicadorOrThrow(principal.getPublicadorId());
	}

	private void assertCanManage(Publicador publicador) {
		UsuarioPrincipal principal = SecurityUtils.currentPrincipal();
		if (principal.hasRole(Rol.ADMINISTRADOR)) {
			return;
		}
		if (!principal.hasRole(Rol.PUBLICADOR) || principal.getPublicadorId() == null
				|| publicador == null || !publicador.getId().equals(principal.getPublicadorId())) {
			throw new BusinessRuleException("no podés gestionar actividades de otro publicador");
		}
	}

	private EstadoPropuesta getInitialState() {
		return estadoPropuestaRepository.findByNombre("INICIADO")
				.orElseThrow(() -> new IllegalStateException(
						"No existe el estado de propuesta inicial INICIADO"));
	}

	private void validateRange(ActividadRequest request) {
		if (request.fechaInicio() == null || request.fechaFin() == null) {
			throw new BusinessRuleException("la actividad debe indicar fecha de inicio y de fin");
		}
		if (request.fechaFin().isBefore(request.fechaInicio())) {
			throw new BusinessRuleException("la fecha de finalización no puede ser anterior a la de inicio");
		}
	}

	private void applyUbicacion(Actividad actividad, ActividadRequest request) {
		GeocodingService.Coordenadas coordenadas = geocodingService
				.geocode(request.lugarRecinto(), request.localidad(), request.direccion())
				.orElseThrow(() -> new BusinessRuleException(
						"no se encontró la ubicación de la actividad: revisá el lugar, la ciudad y la dirección"));
		Ubicacion ubicacion = Ubicacion.builder()
				.ciudad(request.localidad())
				.localidad(request.localidad())
				.direccion(request.direccion())
				.latitud(coordenadas.latitud())
				.longitud(coordenadas.longitud())
				.build();
		actividad.setUbicacion(ubicacionRepository.save(ubicacion));
	}
}
