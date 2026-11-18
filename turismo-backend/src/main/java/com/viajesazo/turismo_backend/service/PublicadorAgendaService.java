package com.viajesazo.turismo_backend.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.response.PropuestaInscriptosResponse;
import com.viajesazo.turismo_backend.dto.response.PublicadorAgendaItemResponse;
import com.viajesazo.turismo_backend.dto.response.PublicadorDashboardResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.repository.ActividadRepository;
import com.viajesazo.turismo_backend.repository.EventoRepository;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.security.SecurityUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PublicadorAgendaService {

	private final UsuarioRepository usuarioRepository;
	private final EventoRepository eventoRepository;
	private final ActividadRepository actividadRepository;
	private final InscriptosService inscriptosService;

	@Transactional(readOnly = true)
	public List<PublicadorAgendaItemResponse> listarAgenda() {
		Long publicadorId = requirePublicadorId();
		List<PublicadorAgendaItemResponse> items = new ArrayList<>();
		for (Evento evento : eventoRepository.findAllByPublicadorId(publicadorId)) {
			items.add(new PublicadorAgendaItemResponse(
					evento.getId(),
					evento.getNombre(),
					"EVENTO",
					evento.getFechaInicio(),
					evento.getFechaFin(),
					evento.getModalidad(),
					firstImage(evento.getImagenes()),
					evento.getHorarioInicio(),
					evento.getHorarioFin()));
		}
		for (Actividad actividad : actividadRepository.findAllByPublicadorId(publicadorId)) {
			items.add(new PublicadorAgendaItemResponse(
					actividad.getId(),
					actividad.getNombre(),
					"ACTIVIDAD",
					actividad.getFechaInicio(),
					actividad.getFechaFin(),
					actividad.getModalidad(),
					firstImage(actividad.getImagenes()),
					null,
					null));
		}
		items.sort(Comparator
				.comparing(PublicadorAgendaItemResponse::fechaInicio)
				.thenComparing(PublicadorAgendaItemResponse::nombre));
		return items;
	}

	@Transactional(readOnly = true)
	public List<LocalDate> listarFechasOcupadas() {
		Long publicadorId = requirePublicadorId();
		Set<LocalDate> fechas = new TreeSet<>();
		for (Evento evento : eventoRepository.findAllByPublicadorId(publicadorId)) {
			addRange(fechas, evento.getFechaInicio(), evento.getFechaFin());
		}
		for (Actividad actividad : actividadRepository.findAllByPublicadorId(publicadorId)) {
			addRange(fechas, actividad.getFechaInicio(), actividad.getFechaFin());
		}
		return new ArrayList<>(fechas);
	}

	@Transactional(readOnly = true)
	public PublicadorDashboardResponse getDashboard() {
		Long publicadorId = requirePublicadorId();
		List<Evento> eventos = eventoRepository.findAllByPublicadorId(publicadorId);
		List<Actividad> actividades = actividadRepository.findAllByPublicadorId(publicadorId);
		LocalDate today = LocalDate.now();
		LocalDate until = today.plusDays(7);
		long proximas = 0;
		for (Evento evento : eventos) {
			if (!evento.getFechaFin().isBefore(today) && !evento.getFechaInicio().isAfter(until)) {
				proximas++;
			}
		}
		for (Actividad actividad : actividades) {
			if (!actividad.getFechaFin().isBefore(today) && !actividad.getFechaInicio().isAfter(until)) {
				proximas++;
			}
		}
		List<PropuestaInscriptosResponse> inscriptos = inscriptosService.listarPropias();
		return new PublicadorDashboardResponse(
				eventos.size(),
				actividades.size(),
				eventos.size() + actividades.size(),
				proximas,
				inscriptos);
	}

	/**
	 * Rechaza si el rango se solapa con otro evento o actividad del mismo publicador.
	 *
	 * @param excludeEventoId    id de evento a ignorar (edición) o null
	 * @param excludeActividadId id de actividad a ignorar (edición) o null
	 */
	@Transactional(readOnly = true)
	public void assertSinSolapamiento(Long publicadorId, LocalDate inicio, LocalDate fin,
			Long excludeEventoId, Long excludeActividadId) {
		if (inicio == null || fin == null) {
			return;
		}
		if (fin.isBefore(inicio)) {
			throw new BusinessRuleException("la fecha de finalización no puede ser anterior a la de inicio");
		}
		boolean overlapEvento = eventoRepository.existsOverlapping(publicadorId, inicio, fin, excludeEventoId);
		boolean overlapActividad = actividadRepository.existsOverlapping(publicadorId, inicio, fin,
				excludeActividadId);
		if (overlapEvento || overlapActividad) {
			throw new BusinessRuleException(
					"ya tenés una propuesta agendada que se solapa con ese rango de fechas");
		}
	}

	private Long requirePublicadorId() {
		Long usuarioId = SecurityUtils.currentUsuarioId();
		Usuario usuario = usuarioRepository.findByIdAndActivoTrue(usuarioId)
				.orElseThrow(() -> new BusinessRuleException("no hay un usuario autenticado"));
		if (usuario.getPublicador() == null) {
			throw new BusinessRuleException("el usuario no está vinculado a un publicador");
		}
		return usuario.getPublicador().getId();
	}

	private static void addRange(Set<LocalDate> fechas, LocalDate inicio, LocalDate fin) {
		if (inicio == null || fin == null) {
			return;
		}
		LocalDate day = inicio;
		while (!day.isAfter(fin)) {
			fechas.add(day);
			day = day.plusDays(1);
		}
	}

	private static String firstImage(List<String> imagenes) {
		if (imagenes == null || imagenes.isEmpty()) {
			return null;
		}
		String url = imagenes.get(0);
		return url == null || url.isBlank() ? null : url;
	}

}
