package com.viajesazo.turismo_backend.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Builder
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "evento")
public class Evento {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 150)
	private String nombre;

	@Column(length = 1000)
	private String descripcion;

	@Enumerated(EnumType.STRING)
	@Column(length = 32)
	private InteresCategoria categoria;

	/**
	 * Gratuito o arancelado. Se inicializa en {@link TipoAcceso#GRATUITO}; el service fuerza
	 * este valor cuando el request no lo trae.
	 */
	@Enumerated(EnumType.STRING)
	@Column(name = "tipo_acceso", length = 16, nullable = false)
	@Builder.Default
	private TipoAcceso tipoAcceso = TipoAcceso.GRATUITO;

	/**
	 * Estado de la propuesta. Se inicializa en {@link EstadoPropuesta#INICIADO} al registrar el
	 * evento y solo cambia por reglas de negocio (todavía sin definir), nunca desde el request.
	 */
	@Enumerated(EnumType.STRING)
	@Column(name = "estado_propuesta", length = 16, nullable = false)
	@Builder.Default
	private EstadoPropuesta estadoPropuesta = EstadoPropuesta.INICIADO;

	@Column(name = "monto_estimado", precision = 12, scale = 2)
	private BigDecimal montoEstimado;

	@Column(name = "descripcion_arancel", length = 1000)
	private String descripcionArancel;

	@Column(name = "sitio_oficial", length = 500)
	private String sitioOficial;

	@Column(name = "lugar_recinto", length = 200)
	private String lugarRecinto;

	@Column(length = 120)
	private String localidad;

	@Column(length = 200)
	private String direccion;

	@Column(precision = 10, scale = 8)
	private BigDecimal latitud;

	@Column(precision = 11, scale = 8)
	private BigDecimal longitud;

	@Column(name = "fecha_inicio", nullable = false)
	private LocalDate fechaInicio;

	@Column(name = "fecha_fin", nullable = false)
	private LocalDate fechaFin;

	@Column(name = "horario_inicio")
	private LocalTime horarioInicio;

	@Column(name = "horario_fin")
	private LocalTime horarioFin;

	/**
	 * LAZY y no EAGER: una colección cargada siempre agrega un JOIN extra a toda consulta que
	 * traiga el evento, y con varias colecciones EAGER es la vía típica a MultipleBagFetchException.
	 * El mapeo a DTO lee la colección, así que solo funciona dentro de una transacción: todos los
	 * métodos de lectura de EventoService son {@code @Transactional(readOnly = true)} por eso.
	 */
	@ElementCollection(fetch = FetchType.LAZY)
	@CollectionTable(name = "evento_imagen", joinColumns = @JoinColumn(name = "evento_id"))
	@Column(name = "url", length = 500)
	@Builder.Default
	private List<String> imagenes = new ArrayList<>();

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "publicador_id", nullable = false)
	private Publicador publicador;

}
