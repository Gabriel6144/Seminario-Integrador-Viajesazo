package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
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

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.dao.DataIntegrityViolationException;

import com.viajesazo.turismo_backend.circuit.CircuitGenerator;
import com.viajesazo.turismo_backend.circuit.HaversineDistanceProvider;
import com.viajesazo.turismo_backend.circuit.TravelEstimate;
import com.viajesazo.turismo_backend.dto.request.ReemplazoItemCircuitoRequest;
import com.viajesazo.turismo_backend.dto.response.OpcionSustitucionResponse;
import com.viajesazo.turismo_backend.dto.response.PropuestaFueraDeHuecoResponse;
import com.viajesazo.turismo_backend.dto.response.GeneracionCircuitoResponse;
import com.viajesazo.turismo_backend.exception.CircuitoDataMissingException;
import com.viajesazo.turismo_backend.exception.ConfirmationRequiredException;
import com.viajesazo.turismo_backend.exception.InvariantViolationException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.CircuitStrategy;
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
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.model.ViajeDiaPlan;
import com.viajesazo.turismo_backend.repository.CircuitoRepository;
import com.viajesazo.turismo_backend.repository.MeGustaRepository;
import com.viajesazo.turismo_backend.repository.PropuestaRepository;
import com.viajesazo.turismo_backend.repository.ViajeRepository;
import com.viajesazo.turismo_backend.security.TestSecuritySupport;

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
    private MeGustaRepository meGustaRepository;
    @Mock
    private CircuitGenerator generator;

    private CircuitoService service;
    private Usuario owner;

    @BeforeEach
    void setUp() {
        owner = TestSecuritySupport.turista(1L, "turista@test.com");
        TestSecuritySupport.authenticateTurista(owner);
        lenient().when(meGustaRepository.findPropuestaIdsByUsuarioId(any())).thenReturn(Set.of());
        lenient().when(meGustaRepository.countByPropuestaIdIn(any())).thenReturn(List.of());
        service = new CircuitoService(circuitoRepository, viajeRepository, propuestaRepository, meGustaRepository,
                generator, new HaversineDistanceProvider(), CLOCK);
    }

    @AfterEach
    void tearDown() {
        TestSecuritySupport.clear();
    }

    @Test
    void reportsAllMissingTripFieldsTogether() {
        Viaje trip = new Viaje();
        trip.setEstado(EstadoViaje.PLANIFICADO);
        trip.setUsuario(owner);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));

        assertThatThrownBy(() -> service.generate(7L, false))
                .isInstanceOf(CircuitoDataMissingException.class)
                .hasMessageContaining("fecha de inicio")
                .hasMessageContaining("fecha de fin")
                .hasMessageContaining("zona de interés")
                .hasMessageContaining("radio de interés")
                .hasMessageContaining("ritmo del viaje")
                .hasMessageContaining("preferencias de interés");
        verify(circuitoRepository, never()).save(any());
    }

    @Test
    void doesNotRegenerateAnExistingCircuit() {
        Viaje trip = new Viaje();
        trip.setEstado(EstadoViaje.PLANIFICADO);
        trip.setUsuario(owner);
        trip.setFechaInicio(java.time.LocalDate.of(2026, 10, 20));
        trip.setFechaFin(java.time.LocalDate.of(2026, 10, 21));
        trip.setRangoInteresKm(20.0);
        trip.setRitmo(com.viajesazo.turismo_backend.model.TipoRitmo.EQUILIBRADO);
        trip.setInteresesCategoria(List.of(InteresCategoria.CULTURA));
        trip.setZonaInteres(com.viajesazo.turismo_backend.model.Ubicacion.builder()
                .latitud(java.math.BigDecimal.valueOf(-31.4))
                .longitud(java.math.BigDecimal.valueOf(-64.2)).build());
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(new com.viajesazo.turismo_backend.model.Circuito()));

        assertThatThrownBy(() -> service.generate(7L, false))
                .isInstanceOf(ConfirmationRequiredException.class)
                .hasMessageContaining("reemplazar=true");
        verify(generator, never()).generate(any(), any(), any(), any(), any());
    }

    @Test
    void snapshotsDescriptionAndCategoryWhenGenerating() {
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(validTrip()));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.empty());
        Evento event = event(NombreEstado.INICIADO, ITEM_DATE, LocalTime.of(10, 0), LocalTime.of(11, 0));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(event));

        GeneracionCircuitoResponse response = realService().generate(7L, false).response();

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
        assertThat(captor.getValue().getFechaInicioSnapshot()).isEqualTo(ITEM_DATE);
        assertThat(captor.getValue().getFechaFinSnapshot()).isEqualTo(ITEM_DATE);
        assertThat(captor.getValue().getRangoInteresKmSnapshot()).isEqualTo(50.0);
        assertThat(captor.getValue().getRitmoSnapshot()).isEqualTo(TipoRitmo.EQUILIBRADO);
        assertThat(captor.getValue().getInteresesCategoriaSnapshot()).containsExactly(InteresCategoria.CULTURA);
        assertThat(captor.getValue().getZonaLatitudSnapshot()).isEqualByComparingTo("-31.4");
        assertThat(captor.getValue().getZonaLongitudSnapshot()).isEqualByComparingTo("-64.2");
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
        activity.setFechaInicio(LocalDate.parse("2026-10-01"));
        activity.setFechaFin(LocalDate.parse("2026-12-31"));
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
    void translatesAUniqueConstraintRaceIntoAConflict() {
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(validTrip()));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.empty());
        when(propuestaRepository.findAll()).thenReturn(List
                .<PropuestaTuristica>of(event(NombreEstado.INICIADO, ITEM_DATE, LocalTime.of(10, 0), LocalTime.of(11, 0))));
        when(circuitoRepository.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("unique constraint circuito.viaje_id"));

        assertThatThrownBy(() -> realService().generate(7L, false))
                .isInstanceOf(ConfirmationRequiredException.class)
                .hasMessageContaining("ya fue generado");
    }

    @Test
    void rejectsGenerationWithoutCompatibleCandidates() {
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(validTrip()));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.empty());
        when(propuestaRepository.findAll()).thenReturn(List.of());

        assertThatThrownBy(() -> realService().generate(7L, false))
                .isInstanceOf(InvariantViolationException.class)
                .hasMessageContaining("no hay propuestas compatibles");
        verify(circuitoRepository, never()).saveAndFlush(any());
    }

    @Test
    void ignoresProposalsOutsideTheSelectedInterests() {
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(validTrip()));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.empty());
        Evento culture = event(NombreEstado.INICIADO, ITEM_DATE, LocalTime.of(10, 0), LocalTime.of(11, 0));
        Evento food = event(NombreEstado.INICIADO, ITEM_DATE, LocalTime.of(12, 0), LocalTime.of(13, 0));
        food.setId(2L);
        food.setCategoria(InteresCategoria.GASTRONOMIA);
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(culture, food));

        GeneracionCircuitoResponse response = realService().generate(7L, false).response();

        assertThat(response.alternativas()).allSatisfy(alternative -> {
            assertThat(alternative.propuestas()).extracting(
                    com.viajesazo.turismo_backend.dto.response.CircuitoItemResponse::propuestaId)
                    .containsOnly(1L);
        });
    }

    @Test
    void regeneratesAndKeepsTheSelectedStrategy() {
        Viaje trip = validTrip();
        Circuito existing = circuitWithItem(ITEM_DATE, LocalTime.of(10, 0), LocalTime.of(11, 0));
        existing.setViaje(trip);
        existing.setEstrategiaSeleccionada(com.viajesazo.turismo_backend.model.CircuitStrategy.INTERESES);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(existing));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                event(NombreEstado.INICIADO, ITEM_DATE, LocalTime.of(10, 0), LocalTime.of(11, 0))));

        CircuitoService.GenerationResult result = realService().generate(7L, true);

        assertThat(result.replaced()).isTrue();
        assertThat(result.response().estrategiaSeleccionada()).isEqualTo(CircuitStrategy.INTERESES);
        assertThat(existing.getFechaInicioSnapshot()).isEqualTo(ITEM_DATE);
    }

    @Test
    void marksTheSelectedCircuitAsOutdatedWhenTheTripChanged() {
        Viaje trip = validTrip();
        Circuito circuito = circuitWithItem(ITEM_DATE, LocalTime.of(10, 0), LocalTime.of(11, 0));
        circuito.setViaje(trip);
        circuito.setEstrategiaSeleccionada(com.viajesazo.turismo_backend.model.CircuitStrategy.CERCANIA);
        circuito.setFechaInicioSnapshot(ITEM_DATE);
        circuito.setFechaFinSnapshot(ITEM_DATE);
        circuito.setRangoInteresKmSnapshot(50.0);
        circuito.setRitmoSnapshot(TipoRitmo.EQUILIBRADO);
        circuito.setInteresesCategoriaSnapshot(List.of(InteresCategoria.CULTURA));
        circuito.setZonaCiudadSnapshot("Córdoba");
        circuito.setZonaLocalidadSnapshot("Nueva Córdoba");
        circuito.setZonaDireccionSnapshot("Av. Hipólito Yrigoyen 325");
        circuito.setZonaLatitudSnapshot(BigDecimal.valueOf(-31.4));
        circuito.setZonaLongitudSnapshot(BigDecimal.valueOf(-64.2));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                event(NombreEstado.INICIADO, ITEM_DATE, LocalTime.of(10, 0), LocalTime.of(11, 0))));
        trip.setInteresesCategoria(List.of(InteresCategoria.CULTURA, InteresCategoria.GASTRONOMIA));
        trip.setRitmo(TipoRitmo.INTENSIVO);

        var response = service.selected(7L);

        assertThat(response.desactualizado()).isTrue();
        assertThat(response.motivosDesactualizacion()).containsExactly("PREFERENCIAS", "RITMO");
    }

    @Test
    @DisplayName("No marca la zona como desactualizada cuando solo cambia la escala decimal")
    void doesNotMarkZoneAsOutdatedWhenOnlyTheDecimalScaleDiffers() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        circuito.setZonaLatitudSnapshot(trip.getZonaInteres().getLatitud().setScale(8));
        circuito.setZonaLongitudSnapshot(trip.getZonaInteres().getLongitud().setScale(8));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        var response = service.selected(7L);

        assertThat(response.desactualizado()).isFalse();
        assertThat(response.motivosDesactualizacion()).isEmpty();
    }

    @Test
    void groupsTheSelectedCircuitByDayIncludingEmptyDaysAndSortsByStartTime() {
        Viaje trip = validTrip();
        trip.setFechaFin(ITEM_DATE.plusDays(2));
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(selectedItem(2L, ITEM_DATE, LocalTime.of(14, 0), LocalTime.of(15, 0), 2));
        alternative.addItem(selectedItem(1L, ITEM_DATE, LocalTime.of(9, 0), LocalTime.of(10, 0), 1));
        alternative.addItem(selectedItem(3L, ITEM_DATE.plusDays(2), LocalTime.of(11, 0),
                LocalTime.of(12, 0), 3));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        var response = service.selectedDetail(7L);

        assertThat(response.circuitoId()).isEqualTo(9L);
        assertThat(response.viajeId()).isEqualTo(7L);
        assertThat(response.estrategia()).isEqualTo(CircuitStrategy.INTERESES);
        assertThat(response.desactualizado()).isFalse();
        assertThat(response.dias()).hasSize(3);
        assertThat(response.dias().get(0).fecha()).isEqualTo(ITEM_DATE);
        assertThat(response.dias().get(0).items()).extracting(
                com.viajesazo.turismo_backend.dto.response.AlternativaItemResponse::itemId)
                .containsExactly(1L, 2L);
        assertThat(response.dias().get(1).fecha()).isEqualTo(ITEM_DATE.plusDays(1));
        assertThat(response.dias().get(1).items()).isEmpty();
        assertThat(response.dias().get(2).items()).extracting(
                com.viajesazo.turismo_backend.dto.response.AlternativaItemResponse::itemId)
                .containsExactly(3L);
    }

    @Test
    void rejectsASelectedCircuitWithoutSelection() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        circuito.setEstrategiaSeleccionada(null);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        assertThatThrownBy(() -> service.selectedDetail(7L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("alternativa seleccionada");
    }

    @Test
    void rejectsASelectedCircuitWhenTheTripDoesNotExist() {
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.selectedDetail(7L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("No existe el viaje");
    }

    @Test
    void deletesAnItemResequencesAndRecalculatesTransfersAndMetrics() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        CircuitoItem first = locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA);
        CircuitoItem removed = locatedItem(2L, LocalTime.of(10, 30), LocalTime.of(11, 30), 2,
                -31.41, -64.21, InteresCategoria.GASTRONOMIA);
        CircuitoItem third = locatedItem(3L, LocalTime.of(13, 0), LocalTime.of(14, 0), 3,
                -31.42, -64.22, InteresCategoria.HISTORIA);
        applyTransfer(first, removed);
        applyTransfer(removed, third);
        alternative.addItem(first);
        alternative.addItem(removed);
        alternative.addItem(third);
        alternative.setDistanciaTotalKm(first.getTrasladoKm() + removed.getTrasladoKm() + third.getTrasladoKm());
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        var response = service.deleteSelectedItem(7L, 2L, true);

        assertThat(alternative.getItems()).extracting(CircuitoItem::getId).containsExactly(1L, 3L);
        assertThat(alternative.getItems()).extracting(CircuitoItem::getOrden).containsExactly(1, 2);
        TravelEstimate firstToThird = estimate(first, third);
        assertThat(third.getTrasladoKm()).isEqualTo(firstToThird.distanceKm());
        assertThat(third.getTrasladoMinutos()).isEqualTo(firstToThird.durationMinutes());
        assertThat(alternative.getDistanciaTotalKm()).isEqualTo(firstToThird.distanceKm());
        assertThat(alternative.getAfinidadIntereses()).isEqualTo(0.5);
        assertThat(alternative.getCategoriasCubiertas())
                .containsExactly(InteresCategoria.CULTURA, InteresCategoria.HISTORIA);
        assertThat(response.dias()).hasSize(1);
        assertThat(response.dias().get(0).items()).extracting(
                com.viajesazo.turismo_backend.dto.response.AlternativaItemResponse::itemId)
                .containsExactly(1L, 3L);
        verify(circuitoRepository).save(circuito);
    }

    @Test
    void keepsTheCircuitAndReturnsAnEmptyDayAfterDeletingTheOnlyItem() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        var response = service.deleteSelectedItem(7L, 1L, true);

        assertThat(alternative.getItems()).isEmpty();
        assertThat(alternative.getDistanciaTotalKm()).isZero();
        assertThat(alternative.getAfinidadIntereses()).isZero();
        assertThat(alternative.getCategoriasCubiertas()).isEmpty();
        assertThat(response.dias()).hasSize(1);
        assertThat(response.dias().get(0).items()).isEmpty();
    }

    @Test
    void requiresConfirmationAndKeepsTheItem() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        assertThatThrownBy(() -> service.deleteSelectedItem(7L, 1L, false))
                .isInstanceOf(ConfirmationRequiredException.class)
                .hasMessageContaining("confirmar=true");
        assertThat(alternative.getItems()).hasSize(1);
        verify(circuitoRepository, never()).save(any());
    }

    @Test
    void rejectsAnItemThatIsNotInTheSelectedAlternative() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa other = new CircuitoAlternativa();
        other.setEstrategia(CircuitStrategy.CERCANIA);
        other.addItem(locatedItem(99L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        circuito.addAlternativa(other);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        assertThatThrownBy(() -> service.deleteSelectedItem(7L, 99L, true))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("No existe la parada");
        verify(circuitoRepository, never()).save(any());
    }

    @Test
    @DisplayName("sustituir: ofrece todo lo que entra en el hueco del día y marca las otras categorías")
    void listsEverythingThatFitsTheDayWindowAndMarksOtherCategories() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(10, 0), LocalTime.of(12, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                proposal(1L, "Ya en el circuito", InteresCategoria.CULTURA, LocalTime.of(10, 30),
                        LocalTime.of(11, 30), -31.40, -64.20),
                proposal(2L, "Evento válido", InteresCategoria.CULTURA, LocalTime.of(10, 30),
                        LocalTime.of(11, 30), -31.41, -64.21),
                activity(3L, "Actividad válida", InteresCategoria.CULTURA, LocalTime.of(10, 30),
                        LocalTime.of(12, 0), 60, -31.41, -64.21),
                proposal(4L, "Empieza antes", InteresCategoria.CULTURA, LocalTime.of(9, 0),
                        LocalTime.of(10, 30), -31.41, -64.21),
                proposal(5L, "Termina después", InteresCategoria.CULTURA, LocalTime.of(11, 0),
                        LocalTime.of(12, 30), -31.41, -64.21),
                proposal(6L, "Otro interés", InteresCategoria.GASTRONOMIA, LocalTime.of(10, 30),
                        LocalTime.of(11, 30), -31.41, -64.21),
                proposal(7L, "Fuera del radio", InteresCategoria.CULTURA, LocalTime.of(10, 30),
                        LocalTime.of(11, 30), -32.50, -65.50)));

        var response = service.replacementAlternatives(7L, 1L);

        // Sin paradas vecinas el hueco es todo el día: ya no hace falta caer en el bloque exacto.
        assertThat(response.huecoInicio()).isEqualTo(LocalTime.of(6, 0));
        assertThat(response.huecoFin()).isEqualTo(LocalTime.of(23, 59));
        assertThat(response.opciones()).extracting(OpcionSustitucionResponse::propuestaId)
                .containsExactly(3L, 4L, 2L, 5L, 6L);
        assertThat(response.opciones()).filteredOn(opcion -> !opcion.enIntereses())
                .extracting(OpcionSustitucionResponse::propuestaId)
                .containsExactly(6L);
        assertThat(response.noEntran()).extracting(PropuestaFueraDeHuecoResponse::propuestaId)
                .containsExactly(7L);
        assertThat(response.noEntran().get(0).motivo()).contains("radio");
        assertThat(response.mensaje()).isNull();
    }

    @Test
    @DisplayName("sustituir: el hueco va de la parada anterior a la siguiente, contando los traslados")
    void onlyOffersWhatFitsBetweenTheNeighboursWithTransfers() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(2L, LocalTime.of(8, 0), LocalTime.of(9, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        alternative.addItem(locatedItem(1L, LocalTime.of(10, 0), LocalTime.of(12, 0), 2,
                -31.40, -64.20, InteresCategoria.CULTURA));
        alternative.addItem(locatedItem(3L, LocalTime.of(13, 0), LocalTime.of(14, 0), 3,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                proposal(10L, "Cerca", InteresCategoria.CULTURA, LocalTime.of(9, 15),
                        LocalTime.of(12, 30), -31.401, -64.201),
                proposal(11L, "Lejos", InteresCategoria.CULTURA, LocalTime.of(9, 30),
                        LocalTime.of(12, 30), -31.60, -64.40)));

        var response = service.replacementAlternatives(7L, 1L);

        assertThat(response.huecoInicio()).isEqualTo(LocalTime.of(9, 0));
        assertThat(response.huecoFin()).isEqualTo(LocalTime.of(13, 0));
        assertThat(response.paradaAnterior().propuestaNombre()).isEqualTo("Propuesta 2");
        assertThat(response.paradaSiguiente().propuestaNombre()).isEqualTo("Propuesta 3");
        assertThat(response.opciones()).extracting(OpcionSustitucionResponse::propuestaId)
                .containsExactly(10L);
        assertThat(response.opciones().get(0).distanciaKm()).isLessThan(1.0);
        assertThat(response.noEntran()).extracting(PropuestaFueraDeHuecoResponse::propuestaId)
                .containsExactly(11L);
        assertThat(response.noEntran().get(0).motivo()).contains("contando los traslados");
    }

    @Test
    @DisplayName("sustituir: primero lo que le gustó, después sus intereses y después la cercanía")
    void ordersSubstitutionsByLikesThenInterestsThenDistance() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(10, 0), LocalTime.of(12, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(meGustaRepository.findPropuestaIdsByUsuarioId(any())).thenReturn(Set.of(12L));
        when(meGustaRepository.countByPropuestaIdIn(any())).thenReturn(List.<Object[]>of(new Object[] { 11L, 5L }));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                proposal(11L, "Cerca y de sus intereses", InteresCategoria.CULTURA, LocalTime.of(10, 30),
                        LocalTime.of(11, 30), -31.401, -64.201),
                proposal(12L, "Le gustó", InteresCategoria.CULTURA, LocalTime.of(10, 30),
                        LocalTime.of(11, 30), -31.45, -64.25),
                proposal(13L, "Otra categoría cerca", InteresCategoria.GASTRONOMIA, LocalTime.of(10, 30),
                        LocalTime.of(11, 30), -31.401, -64.201)));

        var response = service.replacementAlternatives(7L, 1L);

        assertThat(response.opciones()).extracting(OpcionSustitucionResponse::propuestaId)
                .containsExactly(12L, 11L, 13L);
        assertThat(response.opciones().get(0).meGusta()).isTrue();
        assertThat(response.opciones().get(1).totalMeGusta()).isEqualTo(5L);
        assertThat(response.opciones().get(2).enIntereses()).isFalse();
    }

    @Test
    void excludesReplacementsThatOverlapAnotherItemOfTheDay() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(10, 0), LocalTime.of(12, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        alternative.addItem(locatedItem(9L, LocalTime.of(10, 30), LocalTime.of(11, 0), 2,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                proposal(4L, "Se solapa", InteresCategoria.CULTURA, LocalTime.of(10, 30),
                        LocalTime.of(11, 30), -31.40, -64.20),
                proposal(5L, "Entra justo", InteresCategoria.CULTURA, LocalTime.of(10, 0),
                        LocalTime.of(10, 30), -31.40, -64.20)));

        var response = service.replacementAlternatives(7L, 1L);

        assertThat(response.opciones()).extracting(OpcionSustitucionResponse::propuestaId)
                .containsExactly(5L);
    }

    @Test
    void reportsNoAlternativesWhenNothingFitsTheWindow() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(2L, LocalTime.of(8, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        alternative.addItem(locatedItem(1L, LocalTime.of(10, 0), LocalTime.of(12, 0), 2,
                -31.40, -64.20, InteresCategoria.CULTURA));
        alternative.addItem(locatedItem(3L, LocalTime.of(12, 0), LocalTime.of(13, 0), 3,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                proposal(4L, "Empieza antes", InteresCategoria.CULTURA, LocalTime.of(9, 0),
                        LocalTime.of(10, 30), -31.40, -64.20),
                proposal(5L, "Termina tarde", InteresCategoria.CULTURA, LocalTime.of(11, 0),
                        LocalTime.of(12, 30), -31.40, -64.20)));

        var response = service.replacementAlternatives(7L, 1L);

        assertThat(response.opciones()).isEmpty();
        assertThat(response.mensaje()).contains("No hay propuestas");
        assertThat(response.noEntran()).extracting(PropuestaFueraDeHuecoResponse::propuestaId)
                .containsExactlyInAnyOrder(4L, 5L);
    }

    @Test
    void replacesAnItemAndRecalculatesTransfersAndMetrics() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        CircuitoItem previous = locatedItem(1L, LocalTime.of(8, 0), LocalTime.of(9, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA);
        CircuitoItem target = locatedItem(2L, LocalTime.of(10, 0), LocalTime.of(12, 0), 2,
                -31.40, -64.20, InteresCategoria.CULTURA);
        CircuitoItem next = locatedItem(3L, LocalTime.of(14, 0), LocalTime.of(15, 0), 3,
                -31.60, -64.40, InteresCategoria.GASTRONOMIA);
        applyTransfer(previous, target);
        applyTransfer(target, next);
        alternative.addItem(previous);
        alternative.addItem(target);
        alternative.addItem(next);
        alternative.setDistanciaTotalKm(
                previous.getTrasladoKm() + target.getTrasladoKm() + next.getTrasladoKm());
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                proposal(4L, "Museo Reemplazo", InteresCategoria.CULTURA, LocalTime.of(10, 30),
                        LocalTime.of(11, 30), -31.50, -64.30)));

        var response = service.replaceSelectedItem(7L, 2L, new ReemplazoItemCircuitoRequest(4L));

        assertThat(target.getPropuestaId()).isEqualTo(4L);
        assertThat(target.getPropuestaNombre()).isEqualTo("Museo Reemplazo");
        assertThat(target.getHoraInicio()).isEqualTo(LocalTime.of(10, 30));
        assertThat(target.getHoraFin()).isEqualTo(LocalTime.of(11, 30));
        assertThat(target.getDuracionMinutos()).isEqualTo(60);
        assertThat(target.isDisponible()).isTrue();
        assertThat(target.getOrigen())
                .isEqualTo(com.viajesazo.turismo_backend.model.OrigenCircuitoItem.REEMPLAZO);
        TravelEstimate previousToTarget = estimate(previous, target);
        assertThat(target.getTrasladoKm()).isEqualTo(previousToTarget.distanceKm());
        assertThat(target.getTrasladoMinutos()).isEqualTo(previousToTarget.durationMinutes());
        TravelEstimate targetToNext = estimate(target, next);
        assertThat(next.getTrasladoKm()).isEqualTo(targetToNext.distanceKm());
        assertThat(next.getTrasladoMinutos()).isEqualTo(targetToNext.durationMinutes());
        assertThat(alternative.getDistanciaTotalKm()).isEqualTo(
                previous.getTrasladoKm() + target.getTrasladoKm() + next.getTrasladoKm());
        assertThat(alternative.getAfinidadIntereses()).isEqualTo(2.0 / 3.0);
        assertThat(alternative.getCategoriasCubiertas())
                .containsExactly(InteresCategoria.CULTURA, InteresCategoria.GASTRONOMIA);
        assertThat(response.dias().get(0).items()).extracting(
                com.viajesazo.turismo_backend.dto.response.AlternativaItemResponse::propuestaNombre)
                .containsExactly("Propuesta 1", "Museo Reemplazo", "Propuesta 3");
        verify(circuitoRepository).save(circuito);
    }

    @Test
    void rejectsAReplacementThatDoesNotFitAndKeepsTheItem() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        CircuitoItem target = locatedItem(1L, LocalTime.of(10, 0), LocalTime.of(12, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA);
        alternative.addItem(target);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                proposal(6L, "Fuera del radio", InteresCategoria.CULTURA, LocalTime.of(10, 30),
                        LocalTime.of(11, 30), -32.50, -65.50)));

        assertThatThrownBy(() -> service.replaceSelectedItem(7L, 1L, new ReemplazoItemCircuitoRequest(6L)))
                .isInstanceOf(InvariantViolationException.class)
                .hasMessageContaining("no es un reemplazo válido");
        assertThat(target.getPropuestaId()).isEqualTo(1L);
        assertThat(target.getPropuestaNombre()).isEqualTo("Propuesta 1");
        assertThat(target.getHoraInicio()).isEqualTo(LocalTime.of(10, 0));
        verify(circuitoRepository, never()).save(any());
    }

    @Test
    void rejectsAReplacementItemFromAnotherAlternative() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa other = new CircuitoAlternativa();
        other.setEstrategia(CircuitStrategy.CERCANIA);
        other.addItem(locatedItem(99L, LocalTime.of(10, 0), LocalTime.of(12, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        circuito.addAlternativa(other);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        assertThatThrownBy(() -> service.replaceSelectedItem(7L, 99L, new ReemplazoItemCircuitoRequest(2L)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("No existe la parada");
        verify(circuitoRepository, never()).save(any());
    }

    @Test
    @DisplayName("antes de confirmar: elimina una parada de una alternativa sin elegir")
    void deletesAnItemOfAnAlternativeBeforeChoosing() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        circuito.setEstrategiaSeleccionada(null);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        CircuitoItem first = locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA);
        CircuitoItem removed = locatedItem(2L, LocalTime.of(10, 30), LocalTime.of(11, 30), 2,
                -31.41, -64.21, InteresCategoria.GASTRONOMIA);
        CircuitoItem third = locatedItem(3L, LocalTime.of(13, 0), LocalTime.of(14, 0), 3,
                -31.42, -64.22, InteresCategoria.HISTORIA);
        applyTransfer(first, removed);
        applyTransfer(removed, third);
        alternative.addItem(first);
        alternative.addItem(removed);
        alternative.addItem(third);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        GeneracionCircuitoResponse response =
                service.deleteAlternativeItem(7L, CircuitStrategy.INTERESES, 2L, true);

        assertThat(alternative.getItems()).extracting(CircuitoItem::getId).containsExactly(1L, 3L);
        assertThat(alternative.getItems()).extracting(CircuitoItem::getOrden).containsExactly(1, 2);
        TravelEstimate firstToThird = estimate(first, third);
        assertThat(third.getTrasladoKm()).isEqualTo(firstToThird.distanceKm());
        assertThat(alternative.getDistanciaTotalKm()).isEqualTo(firstToThird.distanceKm());
        assertThat(response.estrategiaSeleccionada()).isNull();
        assertThat(response.alternativas()).hasSize(1);
        assertThat(response.alternativas().get(0).propuestas()).extracting(
                com.viajesazo.turismo_backend.dto.response.CircuitoItemResponse::itemId)
                .containsExactly(1L, 3L);
        verify(circuitoRepository).save(circuito);
    }

    @Test
    @DisplayName("antes de confirmar: eliminar una parada pide confirmación")
    void requiresConfirmationToDeleteAnItemOfAnAlternative() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        circuito.setEstrategiaSeleccionada(null);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        assertThatThrownBy(() -> service.deleteAlternativeItem(7L, CircuitStrategy.INTERESES, 1L, false))
                .isInstanceOf(ConfirmationRequiredException.class)
                .hasMessageContaining("confirmar=true");
        assertThat(alternative.getItems()).hasSize(1);
        verify(circuitoRepository, never()).save(any());
    }

    @Test
    @DisplayName("antes de confirmar: lista y aplica un reemplazo en una alternativa sin elegir")
    void replacesAnItemOfAnAlternativeBeforeChoosing() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        circuito.setEstrategiaSeleccionada(null);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        CircuitoItem target = locatedItem(1L, LocalTime.of(10, 0), LocalTime.of(12, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA);
        alternative.addItem(target);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                proposal(4L, "Museo Reemplazo", InteresCategoria.CULTURA, LocalTime.of(10, 30),
                        LocalTime.of(11, 30), -31.50, -64.30)));

        var options = service.alternativeReplacementOptions(7L, CircuitStrategy.INTERESES, 1L);
        assertThat(options.opciones()).extracting(OpcionSustitucionResponse::propuestaNombre)
                .containsExactly("Museo Reemplazo");

        GeneracionCircuitoResponse response = service.replaceAlternativeItem(
                7L, CircuitStrategy.INTERESES, 1L, new ReemplazoItemCircuitoRequest(4L));

        assertThat(target.getPropuestaId()).isEqualTo(4L);
        assertThat(target.getHoraInicio()).isEqualTo(LocalTime.of(10, 30));
        assertThat(target.getOrigen())
                .isEqualTo(com.viajesazo.turismo_backend.model.OrigenCircuitoItem.REEMPLAZO);
        assertThat(response.alternativas().get(0).propuestas()).extracting(
                com.viajesazo.turismo_backend.dto.response.CircuitoItemResponse::propuestaNombre)
                .containsExactly("Museo Reemplazo");
        verify(circuitoRepository).save(circuito);
    }

    @Test
    @DisplayName("con una alternativa ya elegida no se editan las demás desde la vista de recomendados")
    void rejectsEditingAlternativesOnceOneIsChosen() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        assertThatThrownBy(() -> service.deleteAlternativeItem(7L, CircuitStrategy.INTERESES, 1L, true))
                .isInstanceOf(com.viajesazo.turismo_backend.exception.BusinessRuleException.class)
                .hasMessageContaining("ya tiene una alternativa elegida");
        assertThat(alternative.getItems()).hasSize(1);
        verify(circuitoRepository, never()).save(any());
    }

    @Test
    @DisplayName("antes de confirmar: una parada de otra alternativa devuelve 404")
    void rejectsAnItemFromAnotherAlternativeBeforeChoosing() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        circuito.setEstrategiaSeleccionada(null);
        CircuitoAlternativa other = new CircuitoAlternativa();
        other.setEstrategia(CircuitStrategy.CERCANIA);
        other.addItem(locatedItem(99L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        circuito.addAlternativa(other);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        assertThatThrownBy(() -> service.deleteAlternativeItem(7L, CircuitStrategy.INTERESES, 99L, true))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("No existe la parada");
        assertThat(other.getItems()).hasSize(1);
        verify(circuitoRepository, never()).save(any());
    }

    @Test
    @DisplayName("sugerencias fuera de intereses y también de tus intereses fuera de MANUAL")
    void suggestsOtherCategoryAndInInterestsOutsideManual() {
        Viaje trip = validTrip();
        trip.setRitmo(TipoRitmo.EQUILIBRADO);
        Circuito circuito = selectedCircuit(trip);
        circuito.setRitmoSnapshot(TipoRitmo.EQUILIBRADO);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                proposal(10L, "Fuera preferencias", InteresCategoria.GASTRONOMIA, LocalTime.of(11, 0),
                        LocalTime.of(12, 0), -31.41, -64.21),
                activity(11L, "Actividad interés", InteresCategoria.CULTURA, LocalTime.of(14, 0),
                        LocalTime.of(18, 0), 60, -31.41, -64.21)));

        var response = service.daySuggestions(7L, ITEM_DATE);

        assertThat(response.sugerencias()).extracting(
                com.viajesazo.turismo_backend.dto.response.SugerenciaDiaResponse::propuestaId)
                .contains(10L, 11L);
        assertThat(response.sugerencias()).anyMatch(s ->
                s.motivoSugerencia() == com.viajesazo.turismo_backend.model.MotivoSugerencia.OTRA_CATEGORIA);
        assertThat(response.sugerencias()).anyMatch(s ->
                s.motivoSugerencia() == com.viajesazo.turismo_backend.model.MotivoSugerencia.DE_TUS_INTERESES
                        && s.textoMotivo().contains("Es de tus intereses"));
    }

    @Test
    @DisplayName("sugerencias: respeta la agenda de la actividad (fechaInicio/fechaFin)")
    void suggestionsRespectActivityAgendaDates() {
        Viaje trip = validTrip();
        trip.setRitmo(TipoRitmo.EQUILIBRADO);
        Circuito circuito = selectedCircuit(trip);
        circuito.setRitmoSnapshot(TipoRitmo.EQUILIBRADO);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        Actividad activity = activity(11L, "Actividad fuera de agenda", InteresCategoria.CULTURA,
                LocalTime.of(14, 0), LocalTime.of(18, 0), 60, -31.41, -64.21);
        activity.setFechaInicio(LocalDate.of(2026, 11, 1));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(activity));

        var response = service.daySuggestions(7L, ITEM_DATE);

        assertThat(response.sugerencias()).isEmpty();
        assertThat(response.noEntran()).extracting(
                com.viajesazo.turismo_backend.dto.response.PropuestaFueraDeHuecoResponse::propuestaId)
                .contains(11L);
        assertThat(response.noEntran().get(0).motivo()).contains("No está disponible ese día");
    }

    @Test
    @DisplayName("sugerencias: una actividad que se pasa de medianoche no entra")
    void suggestionsRejectActivityThatCrossesMidnight() {
        Viaje trip = validTrip();
        trip.setRitmo(TipoRitmo.EQUILIBRADO);
        Circuito circuito = selectedCircuit(trip);
        circuito.setRitmoSnapshot(TipoRitmo.EQUILIBRADO);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                activity(11L, "Actividad nocturna larga", InteresCategoria.CULTURA,
                        LocalTime.of(22, 0), LocalTime.of(23, 59), 120, -31.41, -64.21)));

        var response = service.daySuggestions(7L, ITEM_DATE);

        assertThat(response.sugerencias()).isEmpty();
        assertThat(response.noEntran()).extracting(
                com.viajesazo.turismo_backend.dto.response.PropuestaFueraDeHuecoResponse::propuestaId)
                .contains(11L);
    }

    @Test
    @DisplayName("sugerencias: una actividad antes de las 06:00 no entra")
    void suggestionsRejectActivityBeforeDayWindow() {
        Viaje trip = validTrip();
        trip.setRitmo(TipoRitmo.EQUILIBRADO);
        Circuito circuito = selectedCircuit(trip);
        circuito.setRitmoSnapshot(TipoRitmo.EQUILIBRADO);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                activity(11L, "Actividad madrugada", InteresCategoria.CULTURA,
                        LocalTime.of(5, 0), LocalTime.of(6, 30), 60, -31.41, -64.21)));

        var response = service.daySuggestions(7L, ITEM_DATE);

        assertThat(response.sugerencias()).isEmpty();
        assertThat(response.noEntran()).extracting(
                com.viajesazo.turismo_backend.dto.response.PropuestaFueraDeHuecoResponse::propuestaId)
                .contains(11L);
    }

    @Test
    @DisplayName("sugerencias: 'Dejarlo así' corta las sugerencias del día")
    void discardedNoticeStopsSuggestions() {
        Viaje trip = validTrip();
        trip.setRitmo(TipoRitmo.EQUILIBRADO);
        Circuito circuito = selectedCircuit(trip);
        circuito.setRitmoSnapshot(TipoRitmo.EQUILIBRADO);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(circuitoRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.discardDayNotice(7L, ITEM_DATE,
                new com.viajesazo.turismo_backend.dto.request.DescartarAvisoDiaRequest(true));

        assertThat(service.daySuggestions(7L, ITEM_DATE).sugerencias()).isEmpty();
    }

    @Test
    @DisplayName("sugerencias: noEntran explica la distancia para propuestas de interés")
    void suggestionsExplainFarProposalsInNoEntran() {
        Viaje trip = validTrip();
        trip.setRitmo(TipoRitmo.EQUILIBRADO);
        Circuito circuito = selectedCircuit(trip);
        circuito.setRitmoSnapshot(TipoRitmo.EQUILIBRADO);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                proposal(12L, "Muy lejos", InteresCategoria.CULTURA, LocalTime.of(11, 0),
                        LocalTime.of(12, 0), -33.0, -64.2)));

        var response = service.daySuggestions(7L, ITEM_DATE);

        assertThat(response.sugerencias()).isEmpty();
        assertThat(response.noEntran()).extracting(
                com.viajesazo.turismo_backend.dto.response.PropuestaFueraDeHuecoResponse::propuestaId)
                .contains(12L);
        assertThat(response.noEntran().get(0).motivo()).contains("km de tu zona");
    }

    @Test
    @DisplayName("sugerencias OTRO_TIPO solo en ritmo MANUAL")
    void suggestsOtherTypeOnlyForManualRhythm() {
        Viaje trip = validTrip();
        trip.setRitmo(TipoRitmo.MANUAL);
        ViajeDiaPlan plan = new ViajeDiaPlan();
        plan.setFecha(ITEM_DATE);
        plan.setCantidadEventos(2);
        plan.setCantidadActividades(0);
        trip.setDiasPlan(List.of(plan));
        Circuito circuito = selectedCircuit(trip);
        circuito.setRitmoSnapshot(TipoRitmo.MANUAL);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                activity(20L, "Actividad en vez de evento", InteresCategoria.CULTURA, LocalTime.of(14, 0),
                        LocalTime.of(18, 0), 60, -31.41, -64.21)));

        var response = service.daySuggestions(7L, ITEM_DATE);

        assertThat(response.sugerencias()).hasSize(1);
        assertThat(response.sugerencias().get(0).motivoSugerencia())
                .isEqualTo(com.viajesazo.turismo_backend.model.MotivoSugerencia.OTRO_TIPO);
        assertThat(response.sugerencias().get(0).textoMotivo())
                .contains("actividad en lugar de un evento");
    }

    @Test
    @DisplayName("POST agrega sugerencia, renumera y PUT descarta aviso")
    void addsSuggestedStopAndDiscardsNotice() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(circuitoRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                proposal(30L, "Gastronomía sugerida", InteresCategoria.GASTRONOMIA, LocalTime.of(11, 0),
                        LocalTime.of(12, 0), -31.41, -64.21)));

        var added = service.addSuggestedItem(7L, ITEM_DATE,
                new com.viajesazo.turismo_backend.dto.request.AgregarParadaSugeridaRequest(30L));

        assertThat(alternative.getItems()).hasSize(2);
        assertThat(alternative.getItems()).extracting(CircuitoItem::getOrden).containsExactly(1, 2);
        assertThat(alternative.getItems().stream()
                .filter(i -> Long.valueOf(30L).equals(i.getPropuestaId())).findFirst())
                .get()
                .extracting(CircuitoItem::getOrigen)
                .isEqualTo(com.viajesazo.turismo_backend.model.OrigenCircuitoItem.SUGERENCIA_ACEPTADA);
        assertThat(added.dias().get(0).resumen().agregadasPorUsuario()).isEqualTo(1);

        var discarded = service.discardDayNotice(7L, ITEM_DATE,
                new com.viajesazo.turismo_backend.dto.request.DescartarAvisoDiaRequest(true));
        assertThat(discarded.dias().get(0).resumen().avisoDescartado()).isTrue();
        assertThat(discarded.dias().get(0).resumen().puedeCompletar()).isFalse();
    }

    @Test
    @DisplayName("POST con propuesta inválida → 422 sin cambios")
    void rejectsInvalidSuggestionWithoutMutating() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.of());

        assertThatThrownBy(() -> service.addSuggestedItem(7L, ITEM_DATE,
                new com.viajesazo.turismo_backend.dto.request.AgregarParadaSugeridaRequest(99L)))
                .isInstanceOf(InvariantViolationException.class);
        assertThat(alternative.getItems()).hasSize(1);
        verify(circuitoRepository, never()).save(any());
    }

    @Test
    @DisplayName("fecha fuera de rango → 404")
    void rejectsSuggestionDateOutsideRange() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        assertThatThrownBy(() -> service.daySuggestions(7L, ITEM_DATE.plusDays(5)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("No existe el día");
    }

    @Test
    @DisplayName("antes de confirmar: cada alternativa avisa qué días quedaron incompletos, contando en vivo")
    void summarizesIncompleteDaysOfAnAlternativeBeforeChoosing() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        circuito.setEstrategiaSeleccionada(null);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        var days = service.alternativeDaySummaries(7L, CircuitStrategy.INTERESES);

        assertThat(days).hasSize(1);
        assertThat(days.get(0).fecha()).isEqualTo(ITEM_DATE);
        var resumen = days.get(0).resumen();
        assertThat(resumen.asignadas()).isEqualTo(1);
        assertThat(resumen.minimo()).isEqualTo(4);
        assertThat(resumen.pendiente()).isTrue();
        assertThat(resumen.puedeCompletar()).isTrue();
        assertThat(resumen.mensaje()).startsWith("Se asignaron 1 de 4 paradas pedidas para este día");
        verify(circuitoRepository, never()).save(any());
    }

    @Test
    @DisplayName("antes de confirmar: suma una sugerencia a la alternativa y la marca como agregada por el turista")
    void addsASuggestionToAnAlternativeBeforeChoosing() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        circuito.setEstrategiaSeleccionada(null);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(propuestaRepository.findAll()).thenReturn(List.<PropuestaTuristica>of(
                proposal(30L, "Gastronomía sugerida", InteresCategoria.GASTRONOMIA, LocalTime.of(11, 0),
                        LocalTime.of(12, 0), -31.41, -64.21)));

        var suggestions = service.alternativeDaySuggestions(7L, CircuitStrategy.INTERESES, ITEM_DATE);
        assertThat(suggestions.sugerencias()).extracting(
                com.viajesazo.turismo_backend.dto.response.SugerenciaDiaResponse::propuestaId)
                .containsExactly(30L);

        GeneracionCircuitoResponse response = service.addAlternativeSuggestedItem(7L, CircuitStrategy.INTERESES,
                ITEM_DATE, new com.viajesazo.turismo_backend.dto.request.AgregarParadaSugeridaRequest(30L));

        assertThat(alternative.getItems()).extracting(CircuitoItem::getOrden).containsExactly(1, 2);
        CircuitoItem added = alternative.getItems().get(1);
        assertThat(added.getPropuestaId()).isEqualTo(30L);
        assertThat(added.getOrigen())
                .isEqualTo(com.viajesazo.turismo_backend.model.OrigenCircuitoItem.SUGERENCIA_ACEPTADA);
        assertThat(response.estrategiaSeleccionada()).isNull();
        assertThat(response.alternativas().get(0).propuestas()).hasSize(2);
        assertThat(circuito.getDiasEstado()).isEmpty();
        verify(circuitoRepository).save(circuito);

        var resumen = service.alternativeDaySummaries(7L, CircuitStrategy.INTERESES).get(0).resumen();
        assertThat(resumen.asignadas()).isEqualTo(1);
        assertThat(resumen.agregadasPorUsuario()).isEqualTo(1);
        assertThat(resumen.mensaje()).startsWith("Se asignaron 2 de 4");
    }

    @Test
    @DisplayName("antes de confirmar: un día completo no ofrece sugerencias")
    void offersNoSuggestionsForACompleteDayBeforeChoosing() {
        Viaje trip = validTrip();
        trip.setRitmo(TipoRitmo.TRANQUILO);
        Circuito circuito = selectedCircuit(trip);
        circuito.setEstrategiaSeleccionada(null);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        alternative.addItem(locatedItem(2L, LocalTime.of(11, 0), LocalTime.of(12, 0), 2,
                -31.41, -64.21, InteresCategoria.CULTURA));
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        var resumen = service.alternativeDaySummaries(7L, CircuitStrategy.INTERESES).get(0).resumen();
        assertThat(resumen.pendiente()).isFalse();
        assertThat(resumen.mensaje()).isNull();

        var suggestions = service.alternativeDaySuggestions(7L, CircuitStrategy.INTERESES, ITEM_DATE);
        assertThat(suggestions.sugerencias()).isEmpty();
        assertThat(suggestions.mensaje()).isEqualTo("No encontramos propuestas para completar este día");
    }

    @Test
    @DisplayName("con una alternativa elegida, el día se completa desde el circuito confirmado")
    void rejectsCompletingAnAlternativeDayOnceOneIsChosen() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        when(viajeRepository.findByIdAndEstadoNotIn(any(), any())).thenReturn(Optional.of(trip));
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));

        assertThatThrownBy(() -> service.addAlternativeSuggestedItem(7L, CircuitStrategy.INTERESES, ITEM_DATE,
                new com.viajesazo.turismo_backend.dto.request.AgregarParadaSugeridaRequest(30L)))
                .isInstanceOf(com.viajesazo.turismo_backend.exception.BusinessRuleException.class)
                .hasMessageContaining("ya tiene una alternativa elegida");
        verify(circuitoRepository, never()).save(any());
    }

    @Test
    @DisplayName("al confirmar, lo sumado antes cuenta como agregado por el turista y no como asignado")
    void keepsStopsAddedBeforeChoosingAsAddedByTheTourist() {
        Viaje trip = validTrip();
        Circuito circuito = selectedCircuit(trip);
        circuito.setEstrategiaSeleccionada(null);
        CircuitoAlternativa alternative = circuito.getAlternativas().get(0);
        alternative.addItem(locatedItem(1L, LocalTime.of(9, 0), LocalTime.of(10, 0), 1,
                -31.40, -64.20, InteresCategoria.CULTURA));
        CircuitoItem added = locatedItem(2L, LocalTime.of(11, 0), LocalTime.of(12, 0), 2,
                -31.41, -64.21, InteresCategoria.GASTRONOMIA);
        added.setOrigen(com.viajesazo.turismo_backend.model.OrigenCircuitoItem.SUGERENCIA_ACEPTADA);
        alternative.addItem(added);
        when(circuitoRepository.findByViajeId(7L)).thenReturn(Optional.of(circuito));
        when(circuitoRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.select(7L, new com.viajesazo.turismo_backend.dto.request.SeleccionCircuitoRequest(
                CircuitStrategy.INTERESES));

        assertThat(circuito.getDiasEstado()).hasSize(1);
        var estado = circuito.getDiasEstado().get(0);
        assertThat(estado.getAsignadas()).isEqualTo(1);
        assertThat(estado.getAgregadasPorUsuario()).isEqualTo(1);
        assertThat(estado.getMensaje()).startsWith("Se asignaron 2 de 4");
    }

    private CircuitoItem locatedItem(Long id, LocalTime start, LocalTime end, int order,
            double latitude, double longitude, InteresCategoria categoria) {
        CircuitoItem item = selectedItem(id, ITEM_DATE, start, end, order);
        item.setCategoria(categoria);
        item.setLatitud(BigDecimal.valueOf(latitude));
        item.setLongitud(BigDecimal.valueOf(longitude));
        item.setTrasladoKm(0);
        item.setTrasladoMinutos(0);
        return item;
    }

    private void applyTransfer(CircuitoItem from, CircuitoItem to) {
        TravelEstimate estimate = estimate(from, to);
        to.setTrasladoKm(estimate.distanceKm());
        to.setTrasladoMinutos(estimate.durationMinutes());
    }

    private TravelEstimate estimate(CircuitoItem from, CircuitoItem to) {
        return new HaversineDistanceProvider().estimate(
                from.getLatitud().doubleValue(), from.getLongitud().doubleValue(),
                to.getLatitud().doubleValue(), to.getLongitud().doubleValue());
    }

    private CircuitoService realService() {
        return new CircuitoService(circuitoRepository, viajeRepository, propuestaRepository, meGustaRepository,
                new CircuitGenerator(new HaversineDistanceProvider()), new HaversineDistanceProvider(), CLOCK);
    }

    private Viaje validTrip() {
        Viaje trip = new Viaje();
        trip.setEstado(EstadoViaje.PLANIFICADO);
        trip.setUsuario(owner);
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

    private Evento proposal(long id, String name, InteresCategoria categoria, LocalTime start,
            LocalTime end, double latitude, double longitude) {
        Evento event = event(NombreEstado.INICIADO, ITEM_DATE, start, end);
        event.setId(id);
        event.setNombre(name);
        event.setCategoria(categoria);
        event.setUbicacion(location(latitude, longitude));
        return event;
    }

    private Actividad activity(long id, String name, InteresCategoria categoria, LocalTime start,
            LocalTime end, int durationMinutes, double latitude, double longitude) {
        Actividad activity = new Actividad();
        activity.setId(id);
        activity.setNombre(name);
        activity.setCategoria(categoria);
        activity.setEstadoPropuesta(estado(NombreEstado.INICIADO));
        activity.setUbicacion(location(latitude, longitude));
        activity.setDuracionMinutos(durationMinutes);
        activity.setFechaInicio(LocalDate.parse("2026-10-01"));
        activity.setFechaFin(LocalDate.parse("2026-12-31"));
        activity.setDisponibilidades(List.of(Disponibilidad.builder()
                .diaSemana(ITEM_DATE.getDayOfWeek())
                .horaInicio(start)
                .horaFin(end)
                .build()));
        return activity;
    }

    private Ubicacion location(double latitude, double longitude) {
        return Ubicacion.builder()
                .ciudad("Córdoba")
                .localidad("Nueva Córdoba")
                .direccion("Av. Hipólito Yrigoyen 325")
                .latitud(BigDecimal.valueOf(latitude))
                .longitud(BigDecimal.valueOf(longitude))
                .build();
    }

    private Circuito selectedCircuit(Viaje trip) {
        Circuito circuito = new Circuito();
        circuito.setId(9L);
        circuito.setViaje(trip);
        circuito.setGeneradoEn(java.time.LocalDateTime.of(2026, 10, 15, 12, 0));
        circuito.setEstrategiaSeleccionada(CircuitStrategy.INTERESES);
        circuito.setDistanciasEstimadas(true);
        circuito.setFechaInicioSnapshot(trip.getFechaInicio());
        circuito.setFechaFinSnapshot(trip.getFechaFin());
        circuito.setRangoInteresKmSnapshot(trip.getRangoInteresKm());
        circuito.setRitmoSnapshot(trip.getRitmo());
        circuito.setInteresesCategoriaSnapshot(new java.util.ArrayList<>(trip.getInteresesCategoria()));
        circuito.setZonaCiudadSnapshot(trip.getZonaInteres().getCiudad());
        circuito.setZonaLocalidadSnapshot(trip.getZonaInteres().getLocalidad());
        circuito.setZonaDireccionSnapshot(trip.getZonaInteres().getDireccion());
        circuito.setZonaLatitudSnapshot(trip.getZonaInteres().getLatitud());
        circuito.setZonaLongitudSnapshot(trip.getZonaInteres().getLongitud());
        CircuitoAlternativa alternative = new CircuitoAlternativa();
        alternative.setEstrategia(CircuitStrategy.INTERESES);
        circuito.addAlternativa(alternative);
        return circuito;
    }

    private CircuitoItem selectedItem(Long id, LocalDate date, LocalTime start, LocalTime end, int order) {
        CircuitoItem item = new CircuitoItem();
        item.setId(id);
        item.setPropuestaId(id);
        item.setPropuestaNombre("Propuesta " + id);
        item.setTipo(TipoRegistro.EVENTO);
        item.setCategoria(InteresCategoria.CULTURA);
        item.setFecha(date);
        item.setOrden(order);
        item.setHoraInicio(start);
        item.setHoraFin(end);
        return item;
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
