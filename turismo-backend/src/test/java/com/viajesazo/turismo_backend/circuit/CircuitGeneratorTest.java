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

    @Test
    void schedulesNightEvents() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(1, 5));
        CircuitCandidate night = candidate(1L, "Peña", InteresCategoria.MUSICA,
                slot(DAY, "20:00", "23:00"));

        List<GeneratedAlternative> alternatives = generator.generate(DAY, DAY, TipoRitmo.EQUILIBRADO,
                Set.of(InteresCategoria.MUSICA), List.of(night));

        for (GeneratedAlternative alternative : alternatives) {
            assertThat(alternative.proposals()).hasSize(1);
            ScheduledProposal proposal = alternative.proposals().get(0);
            assertThat(proposal.start()).isEqualTo(LocalTime.of(20, 0));
            assertThat(proposal.end()).isEqualTo(LocalTime.of(23, 0));
        }
    }

    @Test
    void keepsTheFullActivityDurationAfterATransfer() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(10, 20));
        CircuitCandidate first = candidate(1L, "Primera", InteresCategoria.CULTURA,
                slot(DAY, "10:00", "11:00"));
        CircuitCandidate second = candidate(2L, "Segunda", InteresCategoria.CULTURA,
                slot(DAY, "11:30", "13:00"));

        GeneratedAlternative alternative = generator.generate(DAY, DAY, TipoRitmo.INTENSIVO,
                Set.of(InteresCategoria.CULTURA), List.of(first, second)).get(1);

        ScheduledProposal scheduled = alternative.proposals().stream()
                .filter(proposal -> proposal.proposalId().equals(2L))
                .findFirst()
                .orElseThrow();
        assertThat(scheduled.start()).isEqualTo(LocalTime.of(11, 30));
        assertThat(scheduled.end()).isEqualTo(LocalTime.of(13, 0));
    }

    @Test
    void prioritizesTheSelectedInterests() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(1, 5));
        CircuitCandidate culture = candidate(1L, "B Cultura", InteresCategoria.CULTURA,
                slot(DAY, "09:00", "10:00"));
        CircuitCandidate food = candidate(2L, "A Gastronomia", InteresCategoria.GASTRONOMIA,
                slot(DAY, "10:30", "11:30"));

        GeneratedAlternative alternative = generator.generate(DAY, DAY, TipoRitmo.INTENSIVO,
                Set.of(InteresCategoria.CULTURA), List.of(food, culture)).get(1);

        assertThat(alternative.proposals()).extracting(ScheduledProposal::proposalId)
                .containsExactly(1L, 2L);
    }

    @Test
    void respectsTheDailyLimitOfTheRhythm() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(0, 0));
        List<CircuitCandidate> candidates = List.of(
                candidate(1L, "A", InteresCategoria.CULTURA, slot(DAY, "09:00", "10:00")),
                candidate(2L, "B", InteresCategoria.CULTURA, slot(DAY, "10:30", "11:30")),
                candidate(3L, "C", InteresCategoria.CULTURA, slot(DAY, "12:00", "13:00")),
                candidate(4L, "D", InteresCategoria.CULTURA, slot(DAY, "13:30", "14:30")),
                candidate(5L, "E", InteresCategoria.CULTURA, slot(DAY, "15:00", "16:00")));

        GeneratedAlternative alternative = generator.generate(DAY, DAY, TipoRitmo.EQUILIBRADO,
                Set.of(InteresCategoria.CULTURA), candidates).get(0);

        assertThat(alternative.proposals()).hasSize(3);
    }

    @Test
    void warnsWhenThereAreNoCompatibleProposals() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(1, 5));

        List<GeneratedAlternative> alternatives = generator.generate(DAY, DAY, TipoRitmo.TRANQUILO,
                Set.of(), List.of());

        assertThat(alternatives).hasSize(3);
        assertThat(alternatives).allSatisfy(alternative -> {
            assertThat(alternative.proposals()).isEmpty();
            assertThat(alternative.warning()).contains("No hay propuestas compatibles");
        });
    }

    private CircuitCandidate candidate(Long id, String name, InteresCategoria category,
            CircuitCandidate.TimeSlot slot) {
        return new CircuitCandidate(id, name, null, TipoRegistro.ACTIVIDAD, category, -31.4, -64.2,
                List.of(slot));
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
