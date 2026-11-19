package com.viajesazo.turismo_backend.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.dto.response.AdminDashboardResponse;
import com.viajesazo.turismo_backend.dto.response.PropuestaPopularResponse;
import com.viajesazo.turismo_backend.model.PropuestaTuristica;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.repository.CircuitoItemRepository;
import com.viajesazo.turismo_backend.repository.PropuestaRepository;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.repository.ViajeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {

	private static final int TOP_LIMIT = 10;

	private final UsuarioRepository usuarioRepository;
	private final ViajeRepository viajeRepository;
	private final CircuitoItemRepository circuitoItemRepository;
	private final PropuestaRepository propuestaRepository;

	@Transactional(readOnly = true)
	public AdminDashboardResponse getDashboard() {
		Instant now = Instant.now();
		Instant since7 = now.minus(7, ChronoUnit.DAYS);
		Instant since30 = now.minus(30, ChronoUnit.DAYS);

		long totalUsuarios = usuarioRepository.countByActivoTrue();
		long activos7 = usuarioRepository.countByActivoTrueAndUltimoAccesoEnGreaterThanEqual(since7);
		long activos30 = usuarioRepository.countByActivoTrueAndUltimoAccesoEnGreaterThanEqual(since30);
		long nuevos7 = usuarioRepository.countByActivoTrueAndCreadoEnGreaterThanEqual(since7);
		long nuevos30 = usuarioRepository.countByActivoTrueAndCreadoEnGreaterThanEqual(since30);
		long turistas = usuarioRepository.countActivosByRol(Rol.TURISTA);
		long publicadores = usuarioRepository.countActivosByRol(Rol.PUBLICADOR);
		long viajes7 = viajeRepository.countByCreadoEnGreaterThanEqual(since7);
		long viajes30 = viajeRepository.countByCreadoEnGreaterThanEqual(since30);

		return new AdminDashboardResponse(
				totalUsuarios,
				activos7,
				activos30,
				nuevos7,
				nuevos30,
				turistas,
				publicadores,
				viajes7,
				viajes30,
				topPropuestas());
	}

	private List<PropuestaPopularResponse> topPropuestas() {
		List<Object[]> rows = circuitoItemRepository.countInscriptosGroupedByPropuesta();
		if (rows.isEmpty()) {
			return List.of();
		}

		List<Long> ids = new ArrayList<>();
		Map<Long, Long> counts = new HashMap<>();
		for (Object[] row : rows) {
			if (ids.size() >= TOP_LIMIT) {
				break;
			}
			Long propuestaId = (Long) row[0];
			long count = ((Number) row[1]).longValue();
			ids.add(propuestaId);
			counts.put(propuestaId, count);
		}

		Map<Long, PropuestaTuristica> byId = new HashMap<>();
		for (PropuestaTuristica propuesta : propuestaRepository.findAllById(ids)) {
			byId.put(propuesta.getId(), propuesta);
		}

		List<PropuestaPopularResponse> result = new ArrayList<>();
		for (Long id : ids) {
			PropuestaTuristica propuesta = byId.get(id);
			String nombre = propuesta != null ? propuesta.getNombre() : ("Propuesta #" + id);
			String tipo = propuesta != null ? propuesta.getTipo().name() : "DESCONOCIDO";
			result.add(new PropuestaPopularResponse(id, nombre, tipo, counts.getOrDefault(id, 0L)));
		}
		return result;
	}

}
