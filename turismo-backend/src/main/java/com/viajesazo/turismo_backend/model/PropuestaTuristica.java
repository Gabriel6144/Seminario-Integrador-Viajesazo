package com.viajesazo.turismo_backend.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MappedSuperclass;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Atributos compartidos por todas las propuestas turísticas.
 *
 * <p>Es una clase base de persistencia: cada entidad hija conserva su propia tabla y recibe estas
 * columnas mediante {@link MappedSuperclass}. No existe una tabla para esta clase porque una
 * propuesta turística solo se concreta como un tipo específico, como {@link Evento} o
 * {@link Actividad}.
 */
@MappedSuperclass
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public abstract class PropuestaTuristica {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	protected Long id;

	@Column(nullable = false, length = 150)
	protected String nombre;

	@Column(length = 1000)
	protected String descripcion;

	@Enumerated(EnumType.STRING)
	@Column(length = 32)
	protected InteresCategoria categoria;

	@Enumerated(EnumType.STRING)
	@Column(name = "tipo_acceso", length = 16, nullable = false)
	protected TipoAcceso tipoAcceso = TipoAcceso.GRATUITO;

	@ManyToOne(fetch = jakarta.persistence.FetchType.EAGER, optional = false)
	@JoinColumn(name = "estado_propuesta_id", nullable = false)
	protected EstadoPropuesta estadoPropuesta;

	@Column(length = 120)
	protected String localidad;

	@Column(length = 200)
	protected String direccion;

	@Column(precision = 10, scale = 8)
	protected BigDecimal latitud;

	@Column(precision = 11, scale = 8)
	protected BigDecimal longitud;

	@ManyToOne(fetch = jakarta.persistence.FetchType.LAZY, optional = false)
	@JoinColumn(name = "publicador_id", nullable = false)
	protected Publicador publicador;
}
