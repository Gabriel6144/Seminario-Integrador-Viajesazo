package com.viajesazo.turismo_backend.service;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.request.EventoRequest;
import com.viajesazo.turismo_backend.dto.response.EventoResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.EventoMapper;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.repository.EventoRepository;
import com.viajesazo.turismo_backend.repository.PublicadorRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EventoService {

	private final EventoRepository eventoRepository;
	private final PublicadorRepository publicadorRepository;
	private final Clock clock;
	private final EventoMapper mapper;

	@Transactional
	public EventoResponse create(EventoRequest request) {
		validateRange(request);
		Evento evento = mapper.toEntity(request);
		evento.setPublicador(getPublicadorOrThrow(request.publicadorId()));
		return mapper.toResponse(eventoRepository.save(evento));
	}

	@Transactional
	public EventoResponse update(Long id, EventoRequest request) {
		validateRange(request);
		Evento evento = getOrThrow(id);
		mapper.updateEntity(request, evento);
		evento.setPublicador(getPublicadorOrThrow(request.publicadorId()));
		return mapper.toResponse(eventoRepository.save(evento));
	}

	@Transactional
	public void delete(Long id) {
		eventoRepository.delete(getOrThrow(id));
	}

	@Transactional(readOnly = true)
	public EventoResponse findById(Long id) {
		return mapper.toResponse(getOrThrow(id));
	}

	/**
	 * Listado completo de eventos, paginado. A diferencia de la agenda no aplica ninguna ventana
	 * de fechas: trae todos los eventos cargados, pasados y futuros. El orden lo impone el
	 * repository.
	 */
	@Transactional(readOnly = true)
	public Page<EventoResponse> findAll(Pageable pageable) {
		return eventoRepository.findAllByOrderByFechaInicioAscHorarioInicioAsc(pageable).map(mapper::toResponse);
	}

	@Transactional(readOnly = true)
	public Page<EventoResponse> findByPublicadorId(Long publicadorId, Pageable pageable) {
		if (!publicadorRepository.existsById(publicadorId)) {
			throw new ResourceNotFoundException("No existe el publicador con id " + publicadorId);
		}
		return eventoRepository.findByPublicadorIdOrderByFechaInicioAsc(publicadorId, pageable).map(mapper::toResponse);
	}

	/**
	 * Agenda de la semana ISO en curso: lunes a domingo.
	 *
	 * <p>El límite inferior que se pasa a la consulta es hoy, no el lunes. Un evento que terminó
	 * entre el lunes y ayer solaparía la semana, pero ya pasó y no le sirve a nadie. Como
	 * hoy &gt;= lunes siempre, el solapamiento no se pierde: los eventos que empezaron antes de la
	 * semana y siguen vigentes siguen entrando, porque llegan con fechaFin &gt;= hoy.
	 */
	@Transactional(readOnly = true)
	public Page<EventoResponse> findWeeklyAgenda(Pageable pageable) {
		LocalDate today = LocalDate.now(clock);
		LocalDate sunday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).plusDays(6);
		return eventoRepository.findOverlapping(today, sunday, pageable).map(mapper::toResponse);
	}

	private Evento getOrThrow(Long id) {
		return eventoRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el evento con id " + id));
	}

	private Publicador getPublicadorOrThrow(Long publicadorId) {
		return publicadorRepository.findById(publicadorId)
				.orElseThrow(() -> new ResourceNotFoundException(
						"No existe el publicador con id " + publicadorId));
	}

	private void validateRange(EventoRequest request) {
		if (request.fechaFin().isBefore(request.fechaInicio())) {
			throw new BusinessRuleException("la fecha de finalización no puede ser anterior a la de inicio");
		}
		if (request.horarioInicio() != null && request.horarioFin() != null
				&& !request.horarioFin().isAfter(request.horarioInicio())) {
			throw new BusinessRuleException("el horario de finalización debe ser posterior al de inicio");
		}
	}

}
