package com.viajesazo.turismo_backend.model;

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
	private Categoria categoria;

	@Column(length = 120)
	private String localidad;

	@Column(length = 200)
	private String direccion;

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
