package com.viajesazo.turismo_backend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import com.viajesazo.turismo_backend.model.CircuitStrategy;
import com.viajesazo.turismo_backend.model.Circuito;
import com.viajesazo.turismo_backend.model.CircuitoAlternativa;
import com.viajesazo.turismo_backend.model.CircuitoItem;
import com.viajesazo.turismo_backend.model.EstadoPropuesta;
import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.TipoPropuesta;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.model.Viaje;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/**
 * Inscripción automática: el publicador ve cuántos turistas tienen su propuesta en un circuito
 * confirmado. El conteo sale de las paradas actuales, así que sustituir una parada mueve la
 * inscripción y un viaje dado de baja (CANCELADO) deja de contar.
 */
@DataJpaTest
class CircuitoItemRepositoryTest {

	@Autowired
	private CircuitoItemRepository circuitoItemRepository;

	@Autowired
	private CircuitoRepository circuitoRepository;

	@Autowired
	private ViajeRepository viajeRepository;

	@Autowired
	private UsuarioRepository usuarioRepository;

	@Autowired
	private EventoRepository eventoRepository;

	@Autowired
	private PublicadorRepository publicadorRepository;

	@Autowired
	private EstadoPropuestaRepository estadoPropuestaRepository;

	@Autowired
	private UbicacionRepository ubicacionRepository;

	@PersistenceContext
	private EntityManager entityManager;

	private Publicador publisher;
	private EstadoPropuesta initialState;

	@BeforeEach
	void setUp() {
		publisher = publicadorRepository.save(Publicador.builder()
				.nombre("Turismo Córdoba")
				.email("info@cordoba.gob.ar")
				.build());
		initialState = estadoPropuestaRepository.save(EstadoPropuesta.builder()
				.nombre("INICIADO")
				.descripcion("Propuesta iniciada")
				.build());
	}

	@Test
	@DisplayName("un viaje dado de baja deja de contar como inscripción y no recibe avisos")
	void cancelledTripsDoNotCountAsInscriptions() {
		Evento evento = saveEvento("Festival");
		Viaje activo = saveConfirmedTrip("activo@test.com", EstadoViaje.PLANIFICADO, evento.getId());
		saveConfirmedTrip("cancelado@test.com", EstadoViaje.CANCELADO, evento.getId());
		entityManager.flush();
		entityManager.clear();

		assertThat(circuitoItemRepository.countInscriptosByPropuestaId(evento.getId())).isEqualTo(1L);
		assertThat(circuitoItemRepository.findUsuarioIdsInscriptosByPropuestaId(evento.getId()))
				.containsExactly(activo.getUsuario().getId());
		assertThat(circuitoItemRepository.countInscriptosGroupedByPropuesta())
				.extracting(row -> row[1])
				.containsExactly(1L);
	}

	@Test
	@DisplayName("sustituir una parada del circuito confirmado mueve la inscripción a la nueva propuesta")
	void replacingAStopMovesTheInscription() {
		Evento original = saveEvento("Original");
		Evento reemplazo = saveEvento("Reemplazo");
		Viaje viaje = saveConfirmedTrip("turista@test.com", EstadoViaje.PLANIFICADO, original.getId());
		entityManager.flush();
		assertThat(circuitoItemRepository.countInscriptosByPropuestaId(original.getId())).isEqualTo(1L);

		Circuito circuito = circuitoRepository.findByViajeId(viaje.getId()).orElseThrow();
		circuito.getAlternativas().get(0).getItems().get(0).setPropuestaId(reemplazo.getId());
		circuitoRepository.saveAndFlush(circuito);
		entityManager.clear();

		assertThat(circuitoItemRepository.countInscriptosByPropuestaId(original.getId())).isZero();
		assertThat(circuitoItemRepository.countInscriptosByPropuestaId(reemplazo.getId())).isEqualTo(1L);
	}

	private Viaje saveConfirmedTrip(String email, EstadoViaje estado, Long propuestaId) {
		Usuario usuario = usuarioRepository.save(Usuario.builder()
				.nombre("Turista")
				.email(email)
				.contrasena("hash")
				.roles(new HashSet<>(Set.of(Rol.TURISTA)))
				.build());
		Viaje viaje = viajeRepository.save(Viaje.builder()
				.nombre("Viaje de prueba")
				.zonaInteres(Ubicacion.builder().ciudad("Córdoba").localidad("Córdoba").build())
				.rangoInteresKm(40.0)
				.fechaInicio(LocalDate.parse("2026-11-01"))
				.fechaFin(LocalDate.parse("2026-11-03"))
				.ritmo(TipoRitmo.EQUILIBRADO)
				.estado(estado)
				.usuario(usuario)
				.build());

		Circuito circuito = new Circuito();
		circuito.setViaje(viaje);
		circuito.setGeneradoEn(LocalDateTime.parse("2026-10-20T12:00:00"));
		circuito.setEstrategiaSeleccionada(CircuitStrategy.CERCANIA);
		CircuitoAlternativa alternativa = new CircuitoAlternativa();
		alternativa.setEstrategia(CircuitStrategy.CERCANIA);
		circuito.addAlternativa(alternativa);

		CircuitoItem item = new CircuitoItem();
		item.setPropuestaId(propuestaId);
		item.setPropuestaNombre("Parada");
		item.setTipo(TipoRegistro.EVENTO);
		item.setFecha(LocalDate.parse("2026-11-01"));
		item.setOrden(1);
		item.setHoraInicio(LocalTime.of(10, 0));
		item.setHoraFin(LocalTime.of(12, 0));
		item.setTrasladoKm(0.0);
		item.setTrasladoMinutos(0);
		item.setDisponible(true);
		alternativa.addItem(item);
		circuitoRepository.save(circuito);
		return viaje;
	}

	private Evento saveEvento(String name) {
		Ubicacion ubicacion = ubicacionRepository.save(Ubicacion.builder()
				.ciudad("Córdoba")
				.localidad("Centro")
				.direccion("Av. Colón 100")
				.latitud(new BigDecimal("-31.41350000"))
				.longitud(new BigDecimal("-64.18110000"))
				.build());
		return eventoRepository.save(Evento.builder()
				.nombre(name)
				.descripcion("Evento de prueba")
				.tipoPropuesta(TipoPropuesta.FESTIVAL)
				.categoria(InteresCategoria.CULTURA)
				.ubicacion(ubicacion)
				.fechaInicio(LocalDate.parse("2026-11-01"))
				.fechaFin(LocalDate.parse("2026-11-01"))
				.horarioInicio(LocalTime.of(10, 0))
				.horarioFin(LocalTime.of(12, 0))
				.imagenes(List.of("https://cdn.test/evento.jpg"))
				.estadoPropuesta(initialState)
				.publicador(publisher)
				.build());
	}
}
