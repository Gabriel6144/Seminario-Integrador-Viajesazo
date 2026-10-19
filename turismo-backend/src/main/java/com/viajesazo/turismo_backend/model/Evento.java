package com.viajesazo.turismo_backend.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
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
public class Evento extends PropuestaTuristica {

	@Column(name = "monto_estimado", precision = 12, scale = 2)
	private BigDecimal montoEstimado;

	@Column(name = "descripcion_arancel", length = 1000)
	private String descripcionArancel;

	@Column(name = "sitio_oficial", length = 500)
	private String sitioOficial;

	@Column(name = "lugar_recinto", length = 200)
	private String lugarRecinto;

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
	private List<String> imagenes = new ArrayList<>();

	public static EventoBuilder builder() {
		return new EventoBuilder();
	}

	public static class EventoBuilder {
		private final Evento evento = new Evento();

		public EventoBuilder id(Long id) { evento.setId(id); return this; }
		public EventoBuilder nombre(String nombre) { evento.setNombre(nombre); return this; }
		public EventoBuilder descripcion(String descripcion) { evento.setDescripcion(descripcion); return this; }
		public EventoBuilder categoria(InteresCategoria categoria) { evento.setCategoria(categoria); return this; }
		public EventoBuilder tipoAcceso(TipoAcceso tipoAcceso) { evento.setTipoAcceso(tipoAcceso); return this; }
		public EventoBuilder estadoPropuesta(EstadoPropuesta estado) { evento.setEstadoPropuesta(estado); return this; }
		public EventoBuilder localidad(String localidad) { evento.setLocalidad(localidad); return this; }
		public EventoBuilder direccion(String direccion) { evento.setDireccion(direccion); return this; }
		public EventoBuilder latitud(BigDecimal latitud) { evento.setLatitud(latitud); return this; }
		public EventoBuilder longitud(BigDecimal longitud) { evento.setLongitud(longitud); return this; }
		public EventoBuilder publicador(Publicador publicador) { evento.setPublicador(publicador); return this; }
		public EventoBuilder montoEstimado(BigDecimal monto) { evento.setMontoEstimado(monto); return this; }
		public EventoBuilder descripcionArancel(String descripcion) { evento.setDescripcionArancel(descripcion); return this; }
		public EventoBuilder sitioOficial(String sitio) { evento.setSitioOficial(sitio); return this; }
		public EventoBuilder lugarRecinto(String lugar) { evento.setLugarRecinto(lugar); return this; }
		public EventoBuilder fechaInicio(LocalDate fecha) { evento.setFechaInicio(fecha); return this; }
		public EventoBuilder fechaFin(LocalDate fecha) { evento.setFechaFin(fecha); return this; }
		public EventoBuilder horarioInicio(LocalTime horario) { evento.setHorarioInicio(horario); return this; }
		public EventoBuilder horarioFin(LocalTime horario) { evento.setHorarioFin(horario); return this; }
		public EventoBuilder imagenes(List<String> imagenes) { evento.setImagenes(imagenes); return this; }
		public Evento build() { return evento; }
	}

}
