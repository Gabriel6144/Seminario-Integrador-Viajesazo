package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;

import com.viajesazo.turismo_backend.circuit.CircuitGenerator;
import com.viajesazo.turismo_backend.circuit.HaversineDistanceProvider;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.repository.CircuitoRepository;
import com.viajesazo.turismo_backend.repository.PropuestaRepository;
import com.viajesazo.turismo_backend.repository.ViajeRepository;

@ExtendWith(MockitoExtension.class)
class CircuitoServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-15T12:00:00Z"), ZoneOffset.UTC);

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
}
