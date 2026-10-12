package com.viajesazo.turismo_backend.service;

import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.request.ViajeRequest;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.repository.ViajeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ViajeService {

	private final ViajeRepository viajeRepository;
	@Transactional
	public Viaje create(Viaje viaje) {
		validateRange(viaje);
		return viajeRepository.save(viaje);
	}

	@Transactional
	public Viaje update(Long id, Viaje viaje) {
		validateRange(viaje);
		Viaje persisted = getOrThrow(id);
		persisted.setNombre(viaje.getNombre());
		persisted.setZonaInteres(viaje.getZonaInteres());
		persisted.setRangoInteresKm(viaje.getRangoInteresKm());
		persisted.setFechaInicio(viaje.getFechaInicio());
		persisted.setFechaFin(viaje.getFechaFin());
		persisted.setRitmo(viaje.getRitmo());
		persisted.setEstado(viaje.getEstado());
		persisted.setUsuario(viaje.getUsuario());
		return viajeRepository.save(persisted);
	}

	@Transactional
	public void delete(Long id) {
		viajeRepository.delete(getOrThrow(id));
	}

	@Transactional(readOnly = true)
	public Viaje findById(Long id) {
		return getOrThrow(id);
	}

	@Transactional(readOnly = true)
	public Page<Viaje> findAll(Pageable pageable) {
		return viajeRepository.findAllByOrderByFechaInicioAscFechaFinAsc(pageable);
	}

	@Transactional(readOnly = true)
	public Page<Viaje> findOverlapping(LocalDateTime from, LocalDateTime to, Pageable pageable) {
		if (to.isBefore(from)) {
			throw new BusinessRuleException("la fecha de finalización no puede ser anterior a la de inicio");
		}
		return viajeRepository.findOverlapping(from, to, pageable);
	}

	private Viaje getOrThrow(Long id) {
		return viajeRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el viaje con id " + id));
	}

	private void validateRange(Viaje viaje) {
		if (viaje.getFechaInicio() == null || viaje.getFechaFin() == null) {
			throw new BusinessRuleException("las fechas de inicio y finalización son obligatorias");
		}
		if (viaje.getFechaFin().isBefore(viaje.getFechaInicio())) {
			throw new BusinessRuleException("la fecha de finalización no puede ser anterior a la de inicio");
		}
	}
}
