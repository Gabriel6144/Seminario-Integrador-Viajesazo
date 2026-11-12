package com.viajesazo.turismo_backend.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.request.ActividadRequest;
import com.viajesazo.turismo_backend.dto.response.ActividadResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.ActividadMapper;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.EstadoPropuesta;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.repository.ActividadRepository;
import com.viajesazo.turismo_backend.repository.EstadoPropuestaRepository;
import com.viajesazo.turismo_backend.repository.PublicadorRepository;
import com.viajesazo.turismo_backend.repository.UbicacionRepository;

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

	@Transactional
	public ActividadResponse create(ActividadRequest request) {
		Actividad actividad = mapper.toEntity(request);
		actividad.setTipoAcceso(request.tipoAcceso() == null ? TipoAcceso.GRATUITO : request.tipoAcceso());
		actividad.setEstadoPropuesta(getInitialState());
		actividad.setPublicador(getPublicadorOrThrow(request.publicadorId()));
		applyUbicacion(actividad, request);
		actividad.validarInvariantes();
		return mapper.toResponse(actividadRepository.save(actividad));
	}

	@Transactional
	public ActividadResponse update(Long id, ActividadRequest request) {
		Actividad actividad = getOrThrow(id);
		actividad.validarEditable();
		mapper.updateEntity(request, actividad);
		if (request.tipoAcceso() != null) {
			actividad.setTipoAcceso(request.tipoAcceso());
		}
		actividad.setPublicador(getPublicadorOrThrow(request.publicadorId()));
		applyUbicacion(actividad, request);
		actividad.validarInvariantes();
		return mapper.toResponse(actividadRepository.save(actividad));
	}

	@Transactional
	public void delete(Long id) {
		actividadRepository.delete(getOrThrow(id));
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

	private EstadoPropuesta getInitialState() {
		return estadoPropuestaRepository.findByNombre("INICIADO")
				.orElseThrow(() -> new IllegalStateException(
						"No existe el estado de propuesta inicial INICIADO"));
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
