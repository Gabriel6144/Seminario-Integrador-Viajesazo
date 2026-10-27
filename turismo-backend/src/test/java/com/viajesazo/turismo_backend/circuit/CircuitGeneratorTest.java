package com.viajesazo.turismo_backend.circuit;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.model.TipoRitmo;

class CircuitGeneratorTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 20);

    @Test
    void respectsDatesAndDoesNotRepeatProposals() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(1, 15));
        CircuitCandidate available = candidate(1L, "Museo", InteresCategoria.CULTURA,
                slot(DAY, "10:00", "11:00"));
        CircuitCandidate outside = candidate(2L, "Fuera", InteresCategoria.HISTORIA,
                slot(DAY.minusDays(1), "10:00", "11:00"));

        List<GeneratedAlternative> alternatives = generator.generate(DAY, DAY, TipoRitmo.INTENSIVO,
                Set.of(InteresCategoria.CULTURA), List.of(available, outside));

        assertThat(alternatives).hasSize(3);
        for (GeneratedAlternative alternative : alternatives) {
            assertThat(alternative.proposals()).extracting(ScheduledProposal::proposalId)
                    .containsExactly(1L);
        }
    }

    @Test
    void leavesEnoughTimeForTransfersAndKeepsChronologicalOrder() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(10, 30));
        CircuitCandidate first = candidate(1L, "Primera", InteresCategoria.CULTURA,
                slot(DAY, "10:00", "11:00"));
        CircuitCandidate second = candidate(2L, "Segunda", InteresCategoria.HISTORIA,
                slot(DAY, "11:15", "11:30"));

        GeneratedAlternative alternative = generator.generate(DAY, DAY, TipoRitmo.INTENSIVO,
                Set.of(InteresCategoria.CULTURA, InteresCategoria.HISTORIA), List.of(first, second)).get(1);

        assertThat(alternative.proposals()).hasSize(1);
        assertThat(alternative.proposals().get(0).start()).isEqualTo(LocalTime.of(10, 0));
    }

    private CircuitCandidate candidate(Long id, String name, InteresCategoria category,
            CircuitCandidate.TimeSlot slot) {
        return new CircuitCandidate(id, name, TipoRegistro.ACTIVIDAD, category, -31.4, -64.2, List.of(slot));
    }

    private CircuitCandidate.TimeSlot slot(LocalDate date, String start, String end) {
        return new CircuitCandidate.TimeSlot(date, LocalTime.parse(start), LocalTime.parse(end));
    }

    private record FixedDistanceProvider(double distance, int minutes) implements DistanceProvider {
        @Override
        public TravelEstimate estimate(double fromLatitude, double fromLongitude,
                double toLatitude, double toLongitude) {
            return new TravelEstimate(distance, minutes);
        }

        @Override
        public boolean estimated() {
            return false;
        }
    }
}
