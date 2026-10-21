package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.viajesazo.turismo_backend.dto.request.ActividadRequest;
import com.viajesazo.turismo_backend.dto.request.DisponibilidadRequest;
import com.viajesazo.turismo_backend.dto.response.ActividadResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.InvariantViolationException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.mapper.ActividadMapperImpl;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.Disponibilidad;
import com.viajesazo.turismo_backend.model.EstadoPropuesta;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.Modalidad;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoPropuesta;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.repository.ActividadRepository;
import com.viajesazo.turismo_backend.repository.EstadoPropuestaRepository;
import com.viajesazo.turismo_backend.repository.PublicadorRepository;
import com.viajesazo.turismo_backend.repository.UbicacionRepository;

@ExtendWith(MockitoExtension.class)
class ActividadServiceTest {

	@Mock
	private ActividadRepository actividadRepository;

	@Mock
	private PublicadorRepository publicadorRepository;

	@Mock
	private EstadoPropuestaRepository estadoPropuestaRepository;

	@Mock
	private UbicacionRepository ubicacionRepository;

	@Mock
	private GeocodingService geocodingService;

	private ActividadService service;

	@BeforeEach
	void setUp() {
		service = new ActividadService(actividadRepository, publicadorRepository, estadoPropuestaRepository,
				ubicacionRepository, new ActividadMapperImpl(), geocodingService);
		lenient().when(geocodingService.geocode(any(), any(), any())).thenReturn(Optional
				.of(new GeocodingService.Coordenadas(new BigDecimal("-31.41350000"), new BigDecimal("-64.49470000"))));
		lenient().when(estadoPropuestaRepository.findByNombre("INICIADO"))
				.thenReturn(Optional.of(state("INICIADO")));
		lenient().when(ubicacionRepository.save(any(Ubicacion.class)))
				.thenAnswer(invocation -> invocation.getArgument(0));
	}

	@Test
	@DisplayName("US2: registra la actividad como ACTIVIDAD con estado inicial y coordenadas")
	void createsActivity() {
		when(publicadorRepository.findById(1L)).thenReturn(Optional.of(publisher()));
		when(actividadRepository.save(any(Actividad.class))).thenAnswer(invocation -> {
			Actividad saved = invocation.getArgument(0);
			saved.setId(5L);
			return saved;
		});

		ActividadResponse response = service.create(request(90, TipoPropuesta.VISITA_GUIADA, null,
				List.of(new DisponibilidadRequest(DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(11, 0)))));

		assertThat(response.id()).isEqualTo(5L);
		assertThat(response.tipo()).isEqualTo(TipoRegistro.ACTIVIDAD);
		assertThat(response.estadoPropuesta().getNombre()).isEqualTo("INICIADO");
		assertThat(response.tipoAcceso()).isEqualTo(TipoAcceso.GRATUITO);
		assertThat(response.localidad()).isEqualTo("Cosquín");
		assertThat(response.latitud()).isEqualByComparingTo("-31.41350000");
		assertThat(response.disponibilidades()).hasSize(1);
		assertThat(response.disponibilidades().get(0).diaSemana()).isEqualTo(DayOfWeek.MONDAY);

		ArgumentCaptor<Actividad> captor = ArgumentCaptor.forClass(Actividad.class);
		verify(actividadRepository).save(captor.capture());
		assertThat(captor.getValue().getDuracionMinutos()).isEqualTo(90);
	}

	@Test
	@DisplayName("US2: guarda las franjas horarias en el orden recibido")
	void keepsAvailabilityOrder() {
		when(publicadorRepository.findById(1L)).thenReturn(Optional.of(publisher()));
		when(actividadRepository.save(any(Actividad.class))).thenAnswer(invocation -> invocation.getArgument(0));

		service.create(request(60, TipoPropuesta.DEPORTIVO, TipoAcceso.DE_PAGO,
				List.of(new DisponibilidadRequest(DayOfWeek.SATURDAY, LocalTime.of(10, 0), LocalTime.of(12, 0)),
						new DisponibilidadRequest(DayOfWeek.SUNDAY, LocalTime.of(15, 0), LocalTime.of(16, 0)))));

		ArgumentCaptor<Actividad> captor = ArgumentCaptor.forClass(Actividad.class);
		verify(actividadRepository).save(captor.capture());
		assertThat(captor.getValue().getDisponibilidades())
				.extracting(Disponibilidad::getDiaSemana)
				.containsExactly(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);
	}

	@Test
	@DisplayName("US2: una duración no positiva viola un invariante")
	void rejectsNonPositiveDuration() {
		when(publicadorRepository.findById(1L)).thenReturn(Optional.of(publisher()));

		assertThatThrownBy(() -> service.create(request(0, TipoPropuesta.VISITA_GUIADA, null, List.of())))
				.isInstanceOf(InvariantViolationException.class)
				.hasMessageContaining("duración");
	}

	@Test
	@DisplayName("US2: un tipo de propuesta de evento no es válido para una actividad")
	void rejectsEventOnlyType() {
		when(publicadorRepository.findById(1L)).thenReturn(Optional.of(publisher()));

		assertThatThrownBy(() -> service.create(request(60, TipoPropuesta.FESTIVAL, null, List.of())))
				.isInstanceOf(InvariantViolationException.class)
				.hasMessageContaining("FESTIVAL");
	}

	@Test
	@DisplayName("US2: una franja que termina antes de empezar viola un invariante")
	void rejectsInvalidAvailabilityRange() {
		when(publicadorRepository.findById(1L)).thenReturn(Optional.of(publisher()));

		assertThatThrownBy(() -> service.create(request(60, TipoPropuesta.VISITA_GUIADA, null,
				List.of(new DisponibilidadRequest(DayOfWeek.MONDAY, LocalTime.of(11, 0), LocalTime.of(10, 0))))))
				.isInstanceOf(InvariantViolationException.class)
				.hasMessageContaining("posterior");
	}

	@Test
	@DisplayName("US2: no se puede editar una actividad cancelada")
	void blocksUpdateWhenTerminal() {
		Actividad actividad = storedActivity(state("CANCELADO"));
		when(actividadRepository.findById(5L)).thenReturn(Optional.of(actividad));

		assertThatThrownBy(() -> service.update(5L, request(60, TipoPropuesta.VISITA_GUIADA, null, List.of())))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("no se puede modificar");

		verify(actividadRepository, never()).save(any());
	}

	@Test
	@DisplayName("US2: devuelve 404 cuando la actividad no existe")
	void findByIdNotFound() {
		when(actividadRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.findById(99L))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessageContaining("99");
	}

	@Test
	@DisplayName("US2: lista actividades paginadas y las mapea al response")
	void findAllMapsPage() {
		Pageable pageable = PageRequest.of(0, 20);
		when(actividadRepository.findAllByOrderByNombreAsc(pageable))
				.thenReturn(new PageImpl<>(List.of(storedActivity(state("INICIADO"))), pageable, 1));

		Page<ActividadResponse> page = service.findAll(pageable);

		assertThat(page.getTotalElements()).isEqualTo(1);
		assertThat(page.getContent().get(0).nombre()).isEqualTo("Visita guiada");
		assertThat(page.getContent().get(0).tipo()).isEqualTo(TipoRegistro.ACTIVIDAD);
	}

	@Test
	@DisplayName("US2: elimina la actividad existente y falla si no existe")
	void deletesActivity() {
		when(actividadRepository.findById(5L)).thenReturn(Optional.of(storedActivity(state("INICIADO"))));

		service.delete(5L);

		verify(actividadRepository).delete(any(Actividad.class));
	}

	private ActividadRequest request(int duracion, TipoPropuesta tipoPropuesta, TipoAcceso tipoAcceso,
			List<DisponibilidadRequest> disponibilidades) {
		return new ActividadRequest("Visita guiada", "Recorrido por el centro", InteresCategoria.CULTURA,
				Modalidad.PEDESTRE, tipoPropuesta, tipoAcceso, "Cabildo", "Cosquín", "Av. San Martín 800",
				duracion, disponibilidades, List.of("https://cdn.cordoba.gob.ar/cabildo.jpg"), 1L);
	}

	private Actividad storedActivity(EstadoPropuesta estado) {
		Actividad actividad = new Actividad();
		actividad.setId(5L);
		actividad.setNombre("Visita guiada");
		actividad.setDescripcion("Recorrido por el centro");
		actividad.setTipoPropuesta(TipoPropuesta.VISITA_GUIADA);
		actividad.setCategoria(InteresCategoria.CULTURA);
		actividad.setModalidad(Modalidad.PEDESTRE);
		actividad.setTipoAcceso(TipoAcceso.GRATUITO);
		actividad.setDuracionMinutos(90);
		actividad.setEstadoPropuesta(estado);
		actividad.setPublicador(publisher());
		actividad.setUbicacion(ubicacion());
		return actividad;
	}

	private Publicador publisher() {
		return Publicador.builder().id(1L).nombre("Turismo Córdoba").email("turismo@cordoba.gob.ar").build();
	}

	private EstadoPropuesta state(String nombre) {
		return EstadoPropuesta.builder().id(1L).nombre(nombre).build();
	}

	private Ubicacion ubicacion() {
		return Ubicacion.builder().id(1L).ciudad("Cosquín").localidad("Cosquín")
				.direccion("Av. San Martín 800").latitud(new BigDecimal("-31.41350000"))
				.longitud(new BigDecimal("-64.49470000")).build();
	}
}
