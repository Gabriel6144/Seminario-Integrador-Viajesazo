package com.viajesazo.turismo_backend.repository;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import com.viajesazo.turismo_backend.dto.request.PropuestaFiltro;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.NombreEstado;
import com.viajesazo.turismo_backend.model.PropuestaTuristica;
import com.viajesazo.turismo_backend.model.TipoRegistro;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

/**
 * Filtros y orden del listado unificado de propuestas. El {@code tipo} de la propuesta es el
 * discriminador de herencia: se consulta con {@link Root#type()} y los campos propios de cada
 * subtipo se leen con {@code treat}, nunca con reflexiA3n sobre la clase Java.
 */
public final class PropuestaSpecifications {

	private static final Set<String> COMMON_SORT = Set.of(
			"id", "nombre", "tipoPropuesta", "categoria", "modalidad", "tipoAcceso");

	private static final Set<String> EVENT_SORT = Set.of(
			"fechaInicio", "fechaFin", "horarioInicio", "horarioFin", "montoEstimado");

	private static final Set<String> ACTIVITY_SORT = Set.of("duracionMinutos");

	private static final String ACCENTED = "áéíóúüñ";
	private static final String UNACCENTED = "aeiouun";

	private PropuestaSpecifications() {
	}

	public static boolean isAllowedSort(String property, TipoRegistro tipo) {
		if (COMMON_SORT.contains(property)) {
			return true;
		}
		if (EVENT_SORT.contains(property)) {
			return tipo == TipoRegistro.EVENTO;
		}
		if (ACTIVITY_SORT.contains(property)) {
			return tipo == TipoRegistro.ACTIVIDAD;
		}
		return false;
	}

	public static Specification<PropuestaTuristica> filter(PropuestaFiltro filtro) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();

			if (filtro.tipo() != null) {
				predicates.add(cb.equal(root.type(),
						filtro.tipo() == TipoRegistro.EVENTO ? Evento.class : Actividad.class));
			}
			if (filtro.tipoPropuesta() != null) {
				predicates.add(cb.equal(root.get("tipoPropuesta"), filtro.tipoPropuesta()));
			}
			if (filtro.categoria() != null) {
				predicates.add(cb.equal(root.get("categoria"), filtro.categoria()));
			}
			if (filtro.modalidad() != null) {
				predicates.add(cb.equal(root.get("modalidad"), filtro.modalidad()));
			}
			if (filtro.tipoAcceso() != null) {
				predicates.add(cb.equal(root.get("tipoAcceso"), filtro.tipoAcceso()));
			}
			if (filtro.estado() != null) {
				predicates.add(cb.equal(root.get("estadoPropuesta").get("nombre"), filtro.estado().name()));
			}
			if (filtro.publicadorId() != null) {
				predicates.add(cb.equal(root.get("publicador").get("id"), filtro.publicadorId()));
			}
			if (hasText(filtro.localidad())) {
				predicates.add(cb.equal(normalizedLower(cb, root.get("ubicacion").get("localidad")),
						normalize(filtro.localidad())));
			}
			if (hasText(filtro.ciudad())) {
				predicates.add(cb.equal(normalizedLower(cb, root.get("ubicacion").get("ciudad")),
						normalize(filtro.ciudad())));
			}
			if (hasText(filtro.ubicacion())) {
				String like = "%" + normalize(filtro.ubicacion()) + "%";
				predicates.add(cb.or(
						cb.like(normalizedLower(cb, root.get("ubicacion").get("localidad")), like),
						cb.like(normalizedLower(cb, root.get("lugarRecinto")), like),
						cb.like(normalizedLower(cb, root.get("ubicacion").get("direccion")), like)));
			}
			if (hasText(filtro.q())) {
				String like = "%" + normalize(filtro.q()) + "%";
				predicates.add(cb.or(
						cb.like(normalizedLower(cb, root.get("nombre")), like),
						cb.like(normalizedLower(cb, root.get("descripcion")), like),
						cb.like(normalizedLower(cb, root.get("lugarRecinto")), like),
						cb.like(normalizedLower(cb, root.get("ubicacion").get("localidad")), like)));
			}
			if (filtro.fechaDesde() != null || filtro.fechaHasta() != null) {
				if (filtro.tipo() == TipoRegistro.EVENTO) {
					predicates.add(eventDateOverlap(cb, root, filtro));
				} else if (filtro.tipo() == TipoRegistro.ACTIVIDAD) {
					predicates.add(activityDateOverlap(cb, root, filtro));
				} else {
					predicates.add(cb.or(
							cb.and(cb.equal(root.type(), Evento.class),
									eventDateOverlap(cb, root, filtro)),
							cb.and(cb.equal(root.type(), Actividad.class),
									activityDateOverlap(cb, root, filtro))));
				}
			}
			if (!filtro.incluirCanceladas() && filtro.estado() == null) {
				predicates.add(cb.notEqual(root.get("estadoPropuesta").get("nombre"),
						NombreEstado.CANCELADO.name()));
			}

			return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	/**
	 * La agenda solo muestra propuestas disponibles: una propuesta cancelada no debe aparecer,
	 * aunque sus fechas sigan siendo futuras.
	 */
	public static Specification<PropuestaTuristica> notCancelled() {
		return (root, query, cb) -> cb.notEqual(root.get("estadoPropuesta").get("nombre"),
				NombreEstado.CANCELADO.name());
	}

	/**
	 * Aplica el orden dentro de la misma especificaciA3n. Se ignora en las consultas de conteo:
	 * {@code Page} ejecuta una segunda query con resultado {@code Long} y ordenar ahí no tiene
	 * sentido (ademA�s de que {@code order by} sobre un {@code count} es invA�lido).
	 */
	public static Specification<PropuestaTuristica> sorted(Sort sort, TipoRegistro tipo) {
		return (root, query, cb) -> {
			if (isCountQuery(query) || sort.isUnsorted()) {
				return null;
			}
			List<jakarta.persistence.criteria.Order> orders = new ArrayList<>();
			for (Sort.Order order : sort) {
				Expression<?> path = sortPath(root, cb, order.getProperty(), tipo);
				orders.add(order.isAscending() ? cb.asc(path) : cb.desc(path));
			}
			query.orderBy(orders);
			return null;
		};
	}

	private static Expression<?> sortPath(Root<PropuestaTuristica> root, CriteriaBuilder cb, String property,
			TipoRegistro tipo) {
		if (COMMON_SORT.contains(property)) {
			return root.get(property);
		}
		if (EVENT_SORT.contains(property)) {
			if (tipo != TipoRegistro.EVENTO) {
				throw new BusinessRuleException("el orden por '" + property + "' requiere tipo=EVENTO");
			}
			return cb.treat(root, Evento.class).get(property);
		}
		if (ACTIVITY_SORT.contains(property)) {
			if (tipo != TipoRegistro.ACTIVIDAD) {
				throw new BusinessRuleException("el orden por '" + property + "' requiere tipo=ACTIVIDAD");
			}
			return cb.treat(root, Actividad.class).get(property);
		}
		throw new BusinessRuleException("orden no permitido: " + property);
	}

	private static Predicate eventDateOverlap(CriteriaBuilder cb, Root<PropuestaTuristica> root,
			PropuestaFiltro filtro) {
		Root<Evento> evento = cb.treat(root, Evento.class);
		return dateOverlap(cb, evento.get("fechaInicio"), evento.get("fechaFin"), filtro);
	}

	private static Predicate activityDateOverlap(CriteriaBuilder cb, Root<PropuestaTuristica> root,
			PropuestaFiltro filtro) {
		Root<Actividad> actividad = cb.treat(root, Actividad.class);
		return dateOverlap(cb, actividad.get("fechaInicio"), actividad.get("fechaFin"), filtro);
	}

	private static Predicate dateOverlap(CriteriaBuilder cb, Path<LocalDate> inicio, Path<LocalDate> fin,
			PropuestaFiltro filtro) {
		if (filtro.fechaDesde() != null && filtro.fechaHasta() != null) {
			return cb.and(
					cb.greaterThanOrEqualTo(fin, filtro.fechaDesde()),
					cb.lessThanOrEqualTo(inicio, filtro.fechaHasta()));
		}
		if (filtro.fechaDesde() != null) {
			return cb.greaterThanOrEqualTo(fin, filtro.fechaDesde());
		}
		return cb.lessThanOrEqualTo(inicio, filtro.fechaHasta());
	}

	private static boolean isCountQuery(CriteriaQuery<?> query) {
		Class<?> resultType = query.getResultType();
		return resultType == Long.class || resultType == long.class;
	}

	private static Expression<String> normalizedLower(CriteriaBuilder cb, Expression<String> path) {
		return cb.function("translate", String.class, cb.lower(path),
				cb.literal(ACCENTED), cb.literal(UNACCENTED));
	}

	private static String normalize(String value) {
		return Normalizer.normalize(value, Normalizer.Form.NFD)
				.replaceAll("\\p{M}", "")
				.toLowerCase(Locale.ROOT)
				.trim();
	}

	private static boolean hasText(String value) {
		return value != null && !value.isBlank();
	}
}
