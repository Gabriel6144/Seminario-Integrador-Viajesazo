package com.viajesazo.turismo_backend.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.Set;

import com.viajesazo.turismo_backend.exception.InvariantViolationException;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "evento")
@DiscriminatorValue("EVENTO")
public class Evento extends PropuestaTuristica {

	@Column(name = "monto_estimado", precision = 12, scale = 2)
	private BigDecimal montoEstimado;

	@Column(name = "descripcion_arancel", length = 1000)
	private String descripcionArancel;

	@Column(name = "sitio_oficial", length = 500)
	private String sitioOficial;

	@Column(name = "fecha_inicio", nullable = false)
	private LocalDate fechaInicio;

	@Column(name = "fecha_fin", nullable = false)
	private LocalDate fechaFin;

	@Column(name = "horario_inicio")
	private LocalTime horarioInicio;

	@Column(name = "horario_fin")
	private LocalTime horarioFin;

	@Override
	public TipoRegistro getTipo() {
		return TipoRegistro.EVENTO;
	}

	@Override
	public Set<TipoPropuesta> tiposPermitidos() {
		return EnumSet.complementOf(EnumSet.of(TipoPropuesta.VISITA_GUIADA));
	}

	@Override
	protected void validarInvariantesEspecificas() {
		if (fechaInicio == null || fechaFin == null) {
			throw new InvariantViolationException("las fechas de inicio y fin del evento son obligatorias");
		}
		if (fechaFin.isBefore(fechaInicio)) {
			throw new InvariantViolationException("la fecha de finalización no puede ser anterior a la de inicio");
		}
		if (horarioInicio != null && horarioFin != null && !horarioFin.isAfter(horarioInicio)) {
			throw new InvariantViolationException("el horario de finalización debe ser posterior al de inicio");
		}
		if (tipoAcceso == TipoAcceso.DE_PAGO) {
			if (montoEstimado == null) {
				throw new InvariantViolationException("el monto estimado es obligatorio para un evento arancelado");
			}
			if (sitioOficial == null || sitioOficial.isBlank()) {
				throw new InvariantViolationException("el link al sitio oficial es obligatorio para un evento arancelado");
			}
		}
	}

	public static EventoBuilder builder() {
		return new EventoBuilder();
	}

	public static class EventoBuilder {
		private final Evento evento = new Evento();

		public EventoBuilder id(Long id) {
			evento.setId(id);
			return this;
		}

		public EventoBuilder version(Long version) {
			evento.setVersion(version);
			return this;
		}

		public EventoBuilder nombre(String nombre) {
			evento.setNombre(nombre);
			return this;
		}

		public EventoBuilder descripcion(String descripcion) {
			evento.setDescripcion(descripcion);
			return this;
		}

		public EventoBuilder tipoPropuesta(TipoPropuesta tipoPropuesta) {
			evento.setTipoPropuesta(tipoPropuesta);
			return this;
		}

		public EventoBuilder categoria(InteresCategoria categoria) {
			evento.setCategoria(categoria);
			return this;
		}

		public EventoBuilder modalidad(Modalidad modalidad) {
			evento.setModalidad(modalidad);
			return this;
		}

		public EventoBuilder tipoAcceso(TipoAcceso tipoAcceso) {
			evento.setTipoAcceso(tipoAcceso);
			return this;
		}

		public EventoBuilder estadoPropuesta(EstadoPropuesta estado) {
			evento.setEstadoPropuesta(estado);
			return this;
		}

		public EventoBuilder lugarRecinto(String lugarRecinto) {
			evento.setLugarRecinto(lugarRecinto);
			return this;
		}

		public EventoBuilder ubicacion(Ubicacion ubicacion) {
			evento.setUbicacion(ubicacion);
			return this;
		}

		public EventoBuilder publicador(Publicador publicador) {
			evento.setPublicador(publicador);
			return this;
		}

		public EventoBuilder montoEstimado(BigDecimal monto) {
			evento.setMontoEstimado(monto);
			return this;
		}

		public EventoBuilder descripcionArancel(String descripcion) {
			evento.setDescripcionArancel(descripcion);
			return this;
		}

		public EventoBuilder sitioOficial(String sitio) {
			evento.setSitioOficial(sitio);
			return this;
		}

		public EventoBuilder fechaInicio(LocalDate fecha) {
			evento.setFechaInicio(fecha);
			return this;
		}

		public EventoBuilder fechaFin(LocalDate fecha) {
			evento.setFechaFin(fecha);
			return this;
		}

		public EventoBuilder horarioInicio(LocalTime horario) {
			evento.setHorarioInicio(horario);
			return this;
		}

		public EventoBuilder horarioFin(LocalTime horario) {
			evento.setHorarioFin(horario);
			return this;
		}

		public EventoBuilder imagenes(java.util.List<String> imagenes) {
			evento.setImagenes(imagenes);
			return this;
		}

		public Evento build() {
			return evento;
		}
	}

}
