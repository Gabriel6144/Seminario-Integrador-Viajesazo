package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.dao.DataIntegrityViolationException;

import com.viajesazo.turismo_backend.circuit.CircuitGenerator;
import com.viajesazo.turismo_backend.circuit.HaversineDistanceProvider;
import com.viajesazo.turismo_backend.dto.response.GeneracionCircuitoResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.Circuito;
import com.viajesazo.turismo_backend.model.CircuitoAlternativa;
import com.viajesazo.turismo_backend.model.CircuitoItem;
import com.viajesazo.turismo_backend.model.Disponibilidad;
import com.viajesazo.turismo_backend.model.EstadoPropuesta;
import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.NombreEstado;
import com.viajesazo.turismo_backend.model.PropuestaTuristica;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.repository.CircuitoRepository;
import com.viajesazo.turismo_backend.repository.PropuestaRepository;
import com.viajesazo.turismo_backend.repository.ViajeRepository;

@ExtendWith(MockitoExtension.class)
class CircuitoServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-15T12:00:00Z"), ZoneOffset.UTC);
    private static final LocalDate ITEM_DATE = LocalDate.of(2026, 10, 20);

    @Mock
    private CircuitoRepository circuitoRepository;
    @Mock
    private ViajeRepository viajeRepository;
    @Mock
    private PropuestaRepository propuestaRepository;
    @Mock
    private CircuitGenerator generator;

    private CircuitoService service;

    @BeforeEach
    void setUp() {
        service = new CircuitoService(circuitoRepository, viajeRepository, propuestaRepository, generator,
                new HaversineDistanceProvider(), CLOCK);
    }

    @Test
    void reportsAllMissingTripFieldsTogether() {
        Viaje trip = new Viaje();
        trip.setEstado(EstadoViaje.PLANIFICADO);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));

        assertThatThrownBy(() -> service.generate(7L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("fecha de inicio")
                .hasMessageContaining("fecha de fin")
                .hasMessageContaining("zona de interés")
                .hasMessageContaining("radio de interés")
                .hasMessageContaining("ritmo del viaje");
        verify(circuitoRepository, never()).save(any());
    }

    @Test
    void doesNotRegenerateAnExistingCircuit() {
        Viaje trip = new Viaje();
        trip.setEstado(EstadoViaje.PLANIFICADO);
        trip.setFechaInicio(java.time.LocalDate.of(2026, 10, 20));
        trip.setFechaFin(java.time.LocalDate.of(2026, 10, 21));
        trip.setRangoInteresKm(20.0);
        trip.setRitmo(com.viajesazo.turismo_backend.model.TipoRitmo.EQUILIBRADO);
        trip.setZonaInteres(com.viajesazo.turismo_backend.model.Ubicacion.builder()
                .latitud(java.math.BigDecimal.valueOf(-31.4))
                .longitud(java.math.BigDecimal.valueOf(-64.2)).build());
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(new com.viajesazo.turismo_backend.model.Circuito()));

        assertThatThrownBy(() -> service.generate(7L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ya fue generado");
        verify(generator, never()).generate(any(), any(), any(), any(), any());
    }

    @Test
    void snapshotsDescriptionAndCategoryWhenGenerating() {
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(validTrip()));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.empty());
        Evento event = event(NombreEstado.INICIADO, ITEM_DATE, LocalTime.of(10, 0), LocalTime.of(11, 0));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(event));

        GeneracionCircuitoResponse response = realService().generate(7L);

        assertThat(response.alternativas()).hasSize(3);
        assertThat(response.alternativas()).allSatisfy(alternative -> {
            assertThat(alternative.propuestas()).hasSize(1);
            var item = alternative.propuestas().get(0);
            assertThat(item.descripcion()).isEqualTo("Descripción");
            assertThat(item.categoria()).isEqualTo(InteresCategoria.CULTURA);
            assertThat(item.imagenes()).containsExactly("https://imagen.test/evento.jpg");
            assertThat(item.ciudad()).isEqualTo("Córdoba");
            assertThat(item.localidad()).isEqualTo("Nueva Córdoba");
            assertThat(item.direccion()).isEqualTo("Av. Hipólito Yrigoyen 325");
            assertThat(item.lugarRecinto()).isEqualTo("Paseo del Buen Pastor");
            assertThat(item.latitud()).isEqualByComparingTo("-31.4");
            assertThat(item.longitud()).isEqualByComparingTo("-64.2");
            assertThat(item.tipoAcceso()).isEqualTo(TipoAcceso.DE_PAGO);
            assertThat(item.montoEstimado()).isEqualByComparingTo("1500.00");
            assertThat(item.descripcionArancel()).isEqualTo("Entrada general");
            assertThat(item.sitioOficial()).isEqualTo("https://evento.test");
            assertThat(item.duracionMinutos()).isEqualTo(60);
        });

        ArgumentCaptor<Circuito> captor = ArgumentCaptor.forClass(Circuito.class);
        verify(circuitoRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getAlternativas()).allSatisfy(alternative -> {
            CircuitoItem item = alternative.getItems().get(0);
            assertThat(item.getDescripcion()).isEqualTo("Descripción");
            assertThat(item.getCategoria()).isEqualTo(InteresCategoria.CULTURA);
            assertThat(item.getImagenes()).containsExactly("https://imagen.test/evento.jpg");
            assertThat(item.getTipoAcceso()).isEqualTo(TipoAcceso.DE_PAGO);
            assertThat(item.getMontoEstimado()).isEqualByComparingTo("1500.00");
            assertThat(item.getDuracionMinutos()).isEqualTo(60);
        });
    }

    @Test
    void marksAvailabilityAtReadTimeWithoutSaving() {
        Circuito circuito = circuitWithItem(ITEM_DATE, LocalTime.of(10, 0), LocalTime.of(11, 0));
        Evento event = event(NombreEstado.CANCELADO, ITEM_DATE, LocalTime.of(10, 0), LocalTime.of(11, 0));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(event));

        GeneracionCircuitoResponse response = service.find(7L);

        var item = response.alternativas().get(0).propuestas().get(0);
        assertThat(item.disponible()).isFalse();
        assertThat(item.motivoNoDisponible()).isEqualTo("la propuesta está cancelada");
        verify(circuitoRepository, never()).save(any());
        verify(circuitoRepository, never()).saveAndFlush(any());
    }

    @Test
    void marksUnavailableWhenTheEventScheduleChanged() {
        Circuito circuito = circuitWithItem(ITEM_DATE, LocalTime.of(10, 0), LocalTime.of(11, 0));
        Evento event = event(NombreEstado.INICIADO, ITEM_DATE, LocalTime.of(11, 0), LocalTime.of(12, 0));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(event));

        var item = service.find(7L).alternativas().get(0).propuestas().get(0);

        assertThat(item.disponible()).isFalse();
        assertThat(item.motivoNoDisponible()).isEqualTo("la propuesta cambió de fecha u horario");
    }

    @Test
    void marksUnavailableWhenTheActivityAvailabilityNoLongerCoversTheSlot() {
        Circuito circuito = circuitWithItem(ITEM_DATE, LocalTime.of(10, 0), LocalTime.of(13, 0));
        Actividad activity = new Actividad();
        activity.setId(1L);
        activity.setNombre("Actividad");
        activity.setEstadoPropuesta(estado(NombreEstado.INICIADO));
        activity.setDuracionMinutos(180);
        activity.setDisponibilidades(List.of(Disponibilidad.builder()
                .diaSemana(DayOfWeek.TUESDAY)
                .horaInicio(LocalTime.of(10, 0))
                .horaFin(LocalTime.of(12, 0))
                .build()));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(activity));

        var item = service.find(7L).alternativas().get(0).propuestas().get(0);

        assertThat(item.disponible()).isFalse();
        assertThat(item.motivoNoDisponible()).isEqualTo("la disponibilidad de la actividad cambió");
    }

    @Test
    void marksUnavailableWhenTheSlotAlreadyPassed() {
        LocalDate past = LocalDate.of(2026, 10, 14);
        Circuito circuito = circuitWithItem(past, LocalTime.of(10, 0), LocalTime.of(11, 0));
        Evento event = event(NombreEstado.INICIADO, past, LocalTime.of(10, 0), LocalTime.of(11, 0));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(event));

        var item = service.find(7L).alternativas().get(0).propuestas().get(0);

        assertThat(item.disponible()).isFalse();
        assertThat(item.motivoNoDisponible()).isEqualTo("la fecha de la propuesta ya pasó");
    }

    @Test
    void translatesAUniqueConstraintRaceIntoABusinessRule() {
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(validTrip()));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.empty());
        when(propuestaRepository.findAll()).thenReturn(List.of());
        when(circuitoRepository.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("unique constraint circuito.viaje_id"));

        assertThatThrownBy(() -> realService().generate(7L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ya fue generado");
    }

    private CircuitoService realService() {
        return new CircuitoService(circuitoRepository, viajeRepository, propuestaRepository,
                new CircuitGenerator(new HaversineDistanceProvider()), new HaversineDistanceProvider(), CLOCK);
    }

    private Viaje validTrip() {
        Viaje trip = new Viaje();
        trip.setEstado(EstadoViaje.PLANIFICADO);
        trip.setFechaInicio(ITEM_DATE);
        trip.setFechaFin(ITEM_DATE);
        trip.setRangoInteresKm(50.0);
        trip.setRitmo(TipoRitmo.EQUILIBRADO);
        trip.setInteresesCategoria(List.of(InteresCategoria.CULTURA));
        trip.setZonaInteres(zone());
        return trip;
    }

    private Ubicacion zone() {
        return Ubicacion.builder()
                .ciudad("Córdoba")
                .localidad("Nueva Córdoba")
                .direccion("Av. Hipólito Yrigoyen 325")
                .latitud(BigDecimal.valueOf(-31.4))
                .longitud(BigDecimal.valueOf(-64.2))
                .build();
    }

    private Evento event(NombreEstado state, LocalDate date, LocalTime start, LocalTime end) {
        return Evento.builder()
                .id(1L)
                .nombre("Evento")
                .descripcion("Descripción")
                .categoria(InteresCategoria.CULTURA)
                .tipoAcceso(TipoAcceso.DE_PAGO)
                .estadoPropuesta(estado(state))
                .ubicacion(zone())
                .lugarRecinto("Paseo del Buen Pastor")
                .montoEstimado(BigDecimal.valueOf(1500))
                .descripcionArancel("Entrada general")
                .sitioOficial("https://evento.test")
                .imagenes(List.of("https://imagen.test/evento.jpg"))
                .fechaInicio(date)
                .fechaFin(date)
                .horarioInicio(start)
                .horarioFin(end)
                .build();
    }

    private EstadoPropuesta estado(NombreEstado state) {
        return EstadoPropuesta.builder().nombre(state.name()).build();
    }

    private Circuito circuitWithItem(LocalDate date, LocalTime start, LocalTime end) {
        Circuito circuito = new Circuito();
        CircuitoAlternativa alternative = new CircuitoAlternativa();
        alternative.setEstrategia(com.viajesazo.turismo_backend.model.CircuitStrategy.CERCANIA);
        CircuitoItem item = new CircuitoItem();
        item.setPropuestaId(1L);
        item.setPropuestaNombre("Evento");
        item.setTipo(TipoRegistro.EVENTO);
        item.setFecha(date);
        item.setOrden(1);
        item.setHoraInicio(start);
        item.setHoraFin(end);
        alternative.addItem(item);
        circuito.addAlternativa(alternative);
        return circuito;
    }
}
