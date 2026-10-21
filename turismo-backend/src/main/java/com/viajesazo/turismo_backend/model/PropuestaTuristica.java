package com.viajesazo.turismo_backend.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.InvariantViolationException;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.DiscriminatorType;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Atributos compartidos por todas las propuestas turísticas.
 */
@Entity
@Table(name = "propuesta_turistica")
@Inheritance(strategy = InheritanceType.JOINED)
@DiscriminatorColumn(name = "subtipo", discriminatorType = DiscriminatorType.STRING, length = 32)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public abstract class PropuestaTuristica {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	protected Long id;

	/** Control de concurrencia optimista: dos ediciones simultáneas no se pisan en silencio. */
	@Version
	@Column(nullable = false)
	protected Long version;

	@Column(nullable = false, length = 150)
	protected String nombre;

	@Column(length = 1000)
	protected String descripcion;

	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Enumerated(EnumType.STRING)
	@Column(name = "tipo_propuesta", length = 32)
	protected TipoPropuesta tipoPropuesta;

	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Enumerated(EnumType.STRING)
	@Column(length = 32)
	protected InteresCategoria categoria;

	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Enumerated(EnumType.STRING)
	@Column(length = 32)
	protected Modalidad modalidad;

	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Enumerated(EnumType.STRING)
	@Column(name = "tipo_acceso", length = 16, nullable = false)
	protected TipoAcceso tipoAcceso = TipoAcceso.GRATUITO;

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
	@JoinColumn(name = "estado_propuesta_id", nullable = false)
	protected EstadoPropuesta estadoPropuesta;

	@Column(name = "lugar_recinto", length = 200)
	protected String lugarRecinto;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "ubicacion_id", nullable = false)
	protected Ubicacion ubicacion;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "publicador_id", nullable = false)
	protected Publicador publicador;

	@ElementCollection(fetch = FetchType.LAZY)
	@CollectionTable(name = "propuesta_imagen", joinColumns = @JoinColumn(name = "propuesta_id"))
	@OrderColumn(name = "orden")
	@Column(name = "url", length = 500)
	protected List<String> imagenes = new ArrayList<>();

	/** Clase concreta expuesta por la API: {@code EVENTO} o {@code ACTIVIDAD}. */
	public abstract TipoRegistro getTipo();

	/** Tipos de propuesta que acepta cada subtipo. */
	public abstract Set<TipoPropuesta> tiposPermitidos();

	/**
	 * Invariantes comunes a toda propuesta. El service lo llama explícitamente antes de guardar
	 * para poder responder 422 con un mensaje de negocio; {@link #validarAntesDeGuardar()} es
	 * solo la red de seguridad si algún camino se olvida.
	 */
	public void validarInvariantes() {
		if (nombre == null || nombre.isBlank()) {
			throw new InvariantViolationException("el nombre de la propuesta es obligatorio");
		}
		if (tipoPropuesta == null) {
			throw new InvariantViolationException("el tipo de propuesta es obligatorio");
		}
		if (!tiposPermitidos().contains(tipoPropuesta)) {
			throw new InvariantViolationException(
					"el tipo " + tipoPropuesta + " no es válido para una " + getTipo().name().toLowerCase());
		}
		if (estadoPropuesta == null) {
			throw new InvariantViolationException("el estado de la propuesta es obligatorio");
		}
		if (publicador == null) {
			throw new InvariantViolationException("el publicador de la propuesta es obligatorio");
		}
		if (ubicacion == null) {
			throw new InvariantViolationException("la ubicación de la propuesta es obligatoria");
		}
		if (imagenes == null) {
			imagenes = new ArrayList<>();
		}
		validarInvariantesEspecificas();
	}

	protected abstract void validarInvariantesEspecificas();

	public NombreEstado getNombreEstado() {
		return estadoPropuesta == null ? null : NombreEstado.desde(estadoPropuesta.getNombre());
	}

	/**
	 * Aplica una transición validada por {@link NombreEstado#puedeTransicionarA(NombreEstado)}.
	 * El estado destino tiene que venir ya resuelto contra el repositorio.
	 */
	public void cambiarEstado(EstadoPropuesta nuevo) {
		if (nuevo == null) {
			throw new BusinessRuleException("el nuevo estado es obligatorio");
		}
		NombreEstado destino = NombreEstado.desde(nuevo.getNombre());
		NombreEstado actual = getNombreEstado();
		if (actual != null && !actual.puedeTransicionarA(destino)) {
			throw new BusinessRuleException("no se puede pasar de " + actual + " a " + destino);
		}
		this.estadoPropuesta = nuevo;
	}

	/** CANCELADO y FINALIZADO son terminales: no admiten modificaciones. */
	public void validarEditable() {
		NombreEstado actual = getNombreEstado();
		if (actual != null && actual.esTerminal()) {
			throw new BusinessRuleException(
					"la propuesta está " + actual.name().toLowerCase() + " y no se puede modificar");
		}
	}

	@PrePersist
	@PreUpdate
	private void validarAntesDeGuardar() {
		validarInvariantes();
	}
}
