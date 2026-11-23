package com.viajesazo.turismo_backend.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.request.PropuestaFiltro;
import com.viajesazo.turismo_backend.dto.response.PropuestaResumenContadoresResponse;
import com.viajesazo.turismo_backend.dto.response.PropuestaResumenResponse;
import com.viajesazo.turismo_backend.dto.response.ZonaResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.mapper.PropuestaResumenMapper;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.PropuestaTuristica;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.repository.PropuestaRepository;
import com.viajesazo.turismo_backend.repository.PropuestaSpecifications;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PropuestaQueryService {

	private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.ASC, "nombre")
			.and(Sort.by(Sort.Direction.ASC, "id"));
	private static final Sort AGENDA_SORT = Sort.by(Sort.Direction.ASC, "fechaInicio", "horarioInicio");

	private final PropuestaRepository propuestaRepository;
	private final PropuestaResumenMapper mapper;
	private final Clock clock;

	/**
	 * Listado unificado con filtros opcionales. La paginacion se arma sin orden porque el
	 * orden viaja dentro de la especificacion: asi se puede aplicar {@code treat} al subtipo
	 * correcto y omitirlo en la query de conteo.
	 */
	@Transactional(readOnly = true)
	public Page<PropuestaResumenResponse> search(PropuestaFiltro filtro, Pageable pageable) {
		Sort sort = validSort(pageable.getSort(), filtro.tipo());
		Specification<PropuestaTuristica> specification = PropuestaSpecifications.filter(filtro)
				.and(PropuestaSpecifications.sorted(sort, filtro.tipo()));
		Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
		return propuestaRepository.findAll(specification, unsorted).map(mapper::toResponse);
	}

	/**
	 * Agenda turística (VZ-18): siempre eventos, ordenados por fecha de inicio y hora, y sin
	 * propuestas canceladas. Si el cliente no manda {@code fechaDesde}, la ventana arranca hoy,
	 * así no aparecen eventos ya terminados; un {@code fechaDesde} explícito permite consultar
	 * el pasado.
	 *
	 * <p>El orden es parte del contrato, no una preferencia: se descarta el {@code Sort} que
	 * venga en el {@code Pageable}.
	 */
	@Transactional(readOnly = true)
	public Page<PropuestaResumenResponse> searchAgenda(PropuestaFiltro filtro, Pageable pageable) {
		LocalDate from = filtro.fechaDesde() == null ? LocalDate.now(clock) : filtro.fechaDesde();
		PropuestaFiltro agendaFiltro = new PropuestaFiltro(
				TipoRegistro.EVENTO,
				filtro.tipoPropuesta(),
				filtro.categoria(),
				filtro.modalidad(),
				filtro.tipoAcceso(),
				filtro.estado(),
				filtro.publicadorId(),
				filtro.localidad(),
				filtro.ciudad(),
				filtro.ubicacion(),
				filtro.q(),
				from,
				filtro.fechaHasta(),
				false);
		Specification<PropuestaTuristica> specification = PropuestaSpecifications.filter(agendaFiltro)
				.and(PropuestaSpecifications.notCancelled())
				.and(PropuestaSpecifications.sorted(AGENDA_SORT, TipoRegistro.EVENTO));
		Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
		return propuestaRepository.findAll(specification, unsorted).map(mapper::toResponse);
	}

	/**
	 * Contadores del listado (total, eventos y actividades) con los mismos filtros que
	 * {@link #search}, pero sin la píldora de tipo: las tres cifras siempre describen el
	 * conjunto filtrado completo.
	 */
	@Transactional(readOnly = true)
	public PropuestaResumenContadoresResponse summary(PropuestaFiltro filtro) {
		PropuestaFiltro sinTipo = new PropuestaFiltro(null, filtro.tipoPropuesta(), filtro.categoria(),
				filtro.modalidad(), filtro.tipoAcceso(), filtro.estado(), filtro.publicadorId(),
				filtro.localidad(), filtro.ciudad(), filtro.ubicacion(), filtro.q(), filtro.fechaDesde(),
				filtro.fechaHasta(), filtro.incluirCanceladas());
		Specification<PropuestaTuristica> base = PropuestaSpecifications.filter(sinTipo);
		long total = propuestaRepository.count(base);
		long eventos = propuestaRepository.count(
				base.and((root, query, cb) -> cb.equal(root.type(), Evento.class)));
		long actividades = propuestaRepository.count(
				base.and((root, query, cb) -> cb.equal(root.type(), Actividad.class)));
		return new PropuestaResumenContadoresResponse(total, eventos, actividades);
	}

	/** Ciudades y localidades distintas para el selector de zona. */
	@Transactional(readOnly = true)
	public List<ZonaResponse> zones(Long publicadorId, boolean incluirCanceladas) {
		return propuestaRepository.findDistinctZonas(publicadorId, incluirCanceladas).stream()
				.map(row -> new ZonaResponse((String) row[0], (String) row[1]))
				.toList();
	}

	private Sort validSort(Sort requested, TipoRegistro tipo) {
		if (requested.isUnsorted()) {
			return DEFAULT_SORT;
		}
		for (Sort.Order order : requested) {
			String property = order.getProperty();
			if (PropuestaSpecifications.isAllowedSort(property, tipo)) {
				continue;
			}
			throw new BusinessRuleException("orden no permitido: " + property);
		}
		return requested;
	}
}
