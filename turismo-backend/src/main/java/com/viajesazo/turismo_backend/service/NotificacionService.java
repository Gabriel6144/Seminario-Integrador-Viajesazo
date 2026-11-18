package com.viajesazo.turismo_backend.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.response.NotificacionResponse;
import com.viajesazo.turismo_backend.dto.response.ReprogramarPreviewResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.Notificacion;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.repository.CircuitoItemRepository;
import com.viajesazo.turismo_backend.repository.EventoRepository;
import com.viajesazo.turismo_backend.repository.NotificacionRepository;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.security.SecurityUtils;
import com.viajesazo.turismo_backend.security.UsuarioPrincipal;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificacionService {

	public static final String TIPO_EVENTO_REPROGRAMADO = "EVENTO_REPROGRAMADO";

	private static final DateTimeFormatter FECHA_FMT =
			DateTimeFormatter.ofPattern("d/M/yyyy", Locale.forLanguageTag("es-AR"));

	private final NotificacionRepository notificacionRepository;
	private final CircuitoItemRepository circuitoItemRepository;
	private final EventoRepository eventoRepository;
	private final UsuarioRepository usuarioRepository;

	@Transactional(readOnly = true)
	public ReprogramarPreviewResponse previewReprogramacion(Long eventoId, LocalDate fechaInicio) {
		Evento evento = getEventoOrThrow(eventoId);
		assertCanManage(evento);
		if (fechaInicio == null) {
			throw new BusinessRuleException("la fecha de inicio es obligatoria");
		}
		long destinatarios = circuitoItemRepository.countInscriptosByPropuestaId(evento.getId());
		return new ReprogramarPreviewResponse(
				destinatarios,
				tituloReprogramacion(evento.getNombre()),
				cuerpoReprogramacion(evento.getNombre(), evento.getFechaInicio(), fechaInicio));
	}

	@Transactional
	public void notificarReprogramacion(Evento evento, LocalDate fechaAnteriorInicio, LocalDate fechaAnteriorFin) {
		Objects.requireNonNull(fechaAnteriorFin, "fechaAnteriorFin");
		List<Long> usuarioIds = circuitoItemRepository.findUsuarioIdsInscriptosByPropuestaId(evento.getId());
		if (usuarioIds.isEmpty()) {
			return;
		}
		String titulo = tituloReprogramacion(evento.getNombre());
		String cuerpo = cuerpoReprogramacion(evento.getNombre(), fechaAnteriorInicio, evento.getFechaInicio());
		List<Notificacion> batch = new ArrayList<>(usuarioIds.size());
		for (Long usuarioId : usuarioIds) {
			Usuario usuario = usuarioRepository.findById(usuarioId)
					.orElse(null);
			if (usuario == null || !usuario.isActivo()) {
				continue;
			}
			batch.add(Notificacion.builder()
					.usuario(usuario)
					.titulo(titulo)
					.cuerpo(cuerpo)
					.leida(false)
					.propuestaId(evento.getId())
					.tipo(TIPO_EVENTO_REPROGRAMADO)
					.build());
		}
		if (!batch.isEmpty()) {
			notificacionRepository.saveAll(batch);
		}
	}

	@Transactional(readOnly = true)
	public List<NotificacionResponse> listarMias() {
		Long usuarioId = SecurityUtils.currentPrincipal().getId();
		return notificacionRepository.findByUsuarioIdOrderByCreadaEnDesc(usuarioId).stream()
				.map(this::toResponse)
				.toList();
	}

	@Transactional
	public NotificacionResponse marcarLeida(Long id) {
		Long usuarioId = SecurityUtils.currentPrincipal().getId();
		Notificacion notificacion = notificacionRepository.findByIdAndUsuarioId(id, usuarioId)
				.orElseThrow(() -> new ResourceNotFoundException("No existe la notificación con id " + id));
		notificacion.setLeida(true);
		return toResponse(notificacionRepository.save(notificacion));
	}

	private Evento getEventoOrThrow(Long id) {
		return eventoRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("No existe el evento con id " + id));
	}

	private void assertCanManage(Evento evento) {
		UsuarioPrincipal principal = SecurityUtils.currentPrincipal();
		if (principal.hasRole(Rol.ADMINISTRADOR)) {
			return;
		}
		if (!principal.hasRole(Rol.PUBLICADOR) || principal.getPublicadorId() == null
				|| evento.getPublicador() == null
				|| !evento.getPublicador().getId().equals(principal.getPublicadorId())) {
			throw new BusinessRuleException("no podés gestionar eventos de otro publicador");
		}
	}

	private static String tituloReprogramacion(String nombre) {
		return "Evento reprogramado: " + nombre;
	}

	private static String cuerpoReprogramacion(String nombre, LocalDate fechaAnterior, LocalDate fechaNueva) {
		return "El evento «" + nombre + "» fue reprogramado del "
				+ fechaAnterior.format(FECHA_FMT)
				+ " al "
				+ fechaNueva.format(FECHA_FMT)
				+ ".";
	}

	private NotificacionResponse toResponse(Notificacion n) {
		return new NotificacionResponse(
				n.getId(),
				n.getTitulo(),
				n.getCuerpo(),
				n.isLeida(),
				n.getCreadaEn(),
				n.getPropuestaId(),
				n.getTipo());
	}
}
