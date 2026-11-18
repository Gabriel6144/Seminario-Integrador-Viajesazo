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
import com.viajesazo.turismo_backend.dto.request.ReprogramarEventoRequest;
import com.viajesazo.turismo_backend.dto.response.EventoResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.EventoMapper;
import com.viajesazo.turismo_backend.model.EstadoPropuesta;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.repository.EventoRepository;
import com.viajesazo.turismo_backend.repository.EstadoPropuestaRepository;
import com.viajesazo.turismo_backend.repository.PublicadorRepository;
import com.viajesazo.turismo_backend.repository.UbicacionRepository;
import com.viajesazo.turismo_backend.security.SecurityUtils;
import com.viajesazo.turismo_backend.security.UsuarioPrincipal;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PropuestaService {

	private final EventoRepository eventoRepository;
	private final PublicadorRepository publicadorRepository;
	private final EstadoPropuestaRepository estadoPropuestaRepository;
	private final UbicacionRepository ubicacionRepository;
	private final Clock clock;
	private final EventoMapper mapper;
	private final GeocodingService geocodingService;
	private final PublicadorAgendaService publicadorAgendaService;
	private final NotificacionService notificacionService;

	@Transactional
	public EventoResponse create(EventoRequest request) {
		validateRange(request);
		validateAcceso(request);
		Evento evento = mapper.toEntity(request);
		evento.setTipoAcceso(request.tipoAcceso() == null ? TipoAcceso.GRATUITO : request.tipoAcceso());
		evento.setEstadoPropuesta(getInitialState());
		Publicador publicador = resolvePublicadorForWrite(request.publicadorId(), null);
		evento.setPublicador(publicador);
		publicadorAgendaService.assertSinSolapamiento(
				publicador.getId(), request.fechaInicio(), request.fechaFin(), null, null);
		applyUbicacion(evento, request);
		evento.validarInvariantes();
		return mapper.toResponse(eventoRepository.save(evento));
	}

	@Transactional
	public EventoResponse update(Long id, EventoRequest request) {
		validateRange(request);
		validateAcceso(request);
		Evento evento = getOrThrow(id);
		assertCanManage(evento.getPublicador());
		evento.validarEditable();
		mapper.updateEntity(request, evento);
		if (request.tipoAcceso() != null) {
			evento.setTipoAcceso(request.tipoAcceso());
		}
		Publicador publicador = resolvePublicadorForWrite(request.publicadorId(), evento.getPublicador());
		evento.setPublicador(publicador);
		publicadorAgendaService.assertSinSolapamiento(
				publicador.getId(), request.fechaInicio(), request.fechaFin(), id, null);
		applyUbicacion(evento, request);
		evento.validarInvariantes();
		return mapper.toResponse(eventoRepository.save(evento));
	}

	@Transactional
	public void delete(Long id) {
		Evento evento = getOrThrow(id);
		assertCanManage(evento.getPublicador());
		eventoRepository.delete(evento);
	}

	/**
	 * Reprograma solo las fechas del evento, preservando la duración del rango.
	 * No geocodifica ni toca el resto de campos.
	 */
	@Transactional
	public EventoResponse reprogramar(Long id, ReprogramarEventoRequest request) {
		Evento evento = getOrThrow(id);
		assertCanManage(evento.getPublicador());
		evento.validarEditable();
		if (request.fechaInicio() == null) {
			throw new BusinessRuleException("la fecha de inicio es obligatoria");
		}
		LocalDate fechaAnteriorInicio = evento.getFechaInicio();
		LocalDate fechaAnteriorFin = evento.getFechaFin();
		long dias = java.time.temporal.ChronoUnit.DAYS.between(fechaAnteriorInicio, fechaAnteriorFin);
		LocalDate nuevaInicio = request.fechaInicio();
		LocalDate nuevaFin = nuevaInicio.plusDays(dias);
		publicadorAgendaService.assertSinSolapamiento(
				evento.getPublicador().getId(), nuevaInicio, nuevaFin, id, null);
		evento.setFechaInicio(nuevaInicio);
		evento.setFechaFin(nuevaFin);
		evento.validarInvariantes();
		Evento guardado = eventoRepository.save(evento);
		notificacionService.notificarReprogramacion(guardado, fechaAnteriorInicio, fechaAnteriorFin);
		return mapper.toResponse(guardado);
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

	/**
	 * ABAC: el administrador puede operar sobre cualquier publicador; el publicador solo sobre el
	 * propio. En el alta de un PUBLICADOR se fuerza su {@code publicadorId}.
	 */
	private Publicador resolvePublicadorForWrite(Long requestedPublicadorId, Publicador existing) {
		UsuarioPrincipal principal = SecurityUtils.currentPrincipal();
		if (principal.hasRole(Rol.ADMINISTRADOR)) {
			return getPublicadorOrThrow(requestedPublicadorId);
		}
		if (!principal.hasRole(Rol.PUBLICADOR) || principal.getPublicadorId() == null) {
			throw new BusinessRuleException("solo un publicador o administrador puede gestionar eventos");
		}
		if (existing != null && !existing.getId().equals(principal.getPublicadorId())) {
			throw new BusinessRuleException("no podés gestionar eventos de otro publicador");
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
			throw new BusinessRuleException("no podés gestionar eventos de otro publicador");
		}
	}

	private EstadoPropuesta getInitialState() {
		return estadoPropuestaRepository.findByNombre("INICIADO")
				.orElseThrow(() -> new IllegalStateException(
						"No existe el estado de propuesta inicial INICIADO"));
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

	/**
	 * Un evento arancelado exige monto y link al sitio oficial. La validación vive acá y no en
	 * Bean Validation porque solo aplica cuando {@code tipoAcceso == DE_PAGO}.
	 */
	private void validateAcceso(EventoRequest request) {
		if (request.tipoAcceso() != TipoAcceso.DE_PAGO) {
			return;
		}
		if (request.montoEstimado() == null) {
			throw new BusinessRuleException("el monto estimado es obligatorio para un evento arancelado");
		}
		if (request.sitioOficial() == null || request.sitioOficial().isBlank()) {
			throw new BusinessRuleException("el link al sitio oficial es obligatorio para un evento arancelado");
		}
	}

	/**
	 * Resuelve las coordenadas del evento contra Nominatim. Si la dirección no existe se rechaza
	 * el alta/modificación con 400, según lo acordado: un evento sin ubicación no se puede mostrar
	 * en el mapa.
	 */
	private void applyUbicacion(Evento evento, EventoRequest request) {
		GeocodingService.Coordenadas coordenadas = geocodingService
				.geocode(request.lugarRecinto(), request.localidad(), request.direccion())
				.orElseThrow(() -> new BusinessRuleException(
						"no se encontró la ubicación del evento: revisá el lugar, la ciudad y la dirección"));
		Ubicacion ubicacion = Ubicacion.builder()
				.ciudad(request.localidad())
				.localidad(request.localidad())
				.direccion(request.direccion())
				.latitud(coordenadas.latitud())
				.longitud(coordenadas.longitud())
				.build();
		evento.setUbicacion(ubicacionRepository.save(ubicacion));
	}

}
