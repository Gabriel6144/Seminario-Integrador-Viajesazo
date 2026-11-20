package com.viajesazo.turismo_backend.circuit;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
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
    void prefersWhatTheTouristLikedWhenInterestsTie() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(1, 5));
        CircuitCandidate museum = candidate(1L, "A Museo", InteresCategoria.CULTURA,
                slot(DAY, "10:00", "11:00"));
        CircuitCandidate theatre = candidate(2L, "B Teatro", InteresCategoria.CULTURA,
                slot(DAY, "10:00", "11:00"));

        GeneratedAlternative alternative = generator.generate(DAY, DAY, TipoRitmo.TRANQUILO,
                Set.of(InteresCategoria.CULTURA), List.of(museum, theatre), Map.of(), Set.of(2L), Map.of())
                .get(1);

        // Antes ganaba "A Museo" por orden alfabético aunque el turista le había dado Me gusta al teatro.
        assertThat(alternative.proposals()).extracting(ScheduledProposal::proposalId)
                .containsExactly(2L);
    }

    @Test
    void prefersTheMostPopularWhenTheTouristLikedNeither() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(1, 5));
        CircuitCandidate museum = candidate(1L, "A Museo", InteresCategoria.CULTURA,
                slot(DAY, "10:00", "11:00"));
        CircuitCandidate theatre = candidate(2L, "B Teatro", InteresCategoria.CULTURA,
                slot(DAY, "10:00", "11:00"));

        GeneratedAlternative alternative = generator.generate(DAY, DAY, TipoRitmo.TRANQUILO,
                Set.of(InteresCategoria.CULTURA), List.of(museum, theatre), Map.of(), Set.of(),
                Map.of(1L, 2L, 2L, 9L)).get(1);

        assertThat(alternative.proposals()).extracting(ScheduledProposal::proposalId)
                .containsExactly(2L);
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

        assertThat(alternative.proposals()).hasSize(4);
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

    @Test
    void fillsTheDayWhenTheStrategyChoosesALateProposalFirst() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(1, 5));
        CircuitCandidate night = candidate(1L, "A Peña nocturna", InteresCategoria.CULTURA,
                slot(DAY, "20:00", "21:00"));
        CircuitCandidate first = candidate(2L, "B Museo", InteresCategoria.CULTURA,
                slot(DAY, "09:00", "10:00"));
        CircuitCandidate second = candidate(3L, "C Paseo", InteresCategoria.CULTURA,
                slot(DAY, "11:00", "12:00"));
        CircuitCandidate third = candidate(4L, "D Feria", InteresCategoria.CULTURA,
                slot(DAY, "13:00", "14:00"));

        GeneratedAlternative alternative = generator.generate(DAY, DAY, TipoRitmo.INTENSIVO,
                Set.of(InteresCategoria.CULTURA), List.of(night, first, second, third)).get(1);

        assertThat(alternative.proposals()).extracting(ScheduledProposal::proposalId)
                .containsExactly(2L, 3L, 4L, 1L);
    }

    @Test
    void stopsCompactingAtTheDailyLimit() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(0, 0));
        List<CircuitCandidate> candidates = List.of(
                candidate(1L, "A Noche", InteresCategoria.CULTURA, slot(DAY, "20:00", "21:00")),
                candidate(2L, "B Museo", InteresCategoria.CULTURA, slot(DAY, "09:00", "10:00")),
                candidate(3L, "C Paseo", InteresCategoria.CULTURA, slot(DAY, "11:00", "12:00")),
                candidate(4L, "D Feria", InteresCategoria.CULTURA, slot(DAY, "13:00", "14:00")),
                candidate(5L, "E Sendero", InteresCategoria.CULTURA, slot(DAY, "15:00", "16:00")));

        GeneratedAlternative alternative = generator.generate(DAY, DAY, TipoRitmo.INTENSIVO,
                Set.of(InteresCategoria.CULTURA), candidates).get(1);

        assertThat(alternative.proposals()).hasSize(5);
    }

    @Test
    void recalculatesTransfersForProposalsInsertedByCompaction() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(2, 10));
        CircuitCandidate night = candidate(1L, "A Noche", InteresCategoria.CULTURA,
                slot(DAY, "20:00", "21:00"));
        CircuitCandidate morning = candidate(2L, "B Mañana", InteresCategoria.CULTURA,
                slot(DAY, "09:00", "10:00"));
        CircuitCandidate noon = candidate(3L, "C Mediodía", InteresCategoria.CULTURA,
                slot(DAY, "11:00", "12:00"));

        GeneratedAlternative alternative = generator.generate(DAY, DAY, TipoRitmo.INTENSIVO,
                Set.of(InteresCategoria.CULTURA), List.of(night, morning, noon)).get(1);

        assertThat(alternative.proposals()).hasSize(3);
        assertThat(alternative.proposals().get(0).transferDistanceKm()).isZero();
        assertThat(alternative.proposals().get(1).transferDistanceKm()).isEqualTo(2);
        assertThat(alternative.proposals().get(2).transferDistanceKm()).isEqualTo(2);
        assertThat(alternative.totalDistanceKm()).isEqualTo(4);
    }

    @Test
    void doesNotForceAProposalWhenTheGapIsTooShortForTheTransfer() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(10, 30));
        CircuitCandidate night = candidate(1L, "A Noche", InteresCategoria.CULTURA,
                slot(DAY, "20:00", "21:00"));
        CircuitCandidate morning = candidate(2L, "B Mañana", InteresCategoria.CULTURA,
                slot(DAY, "09:00", "10:00"));
        CircuitCandidate noon = candidate(3L, "C Mediodía", InteresCategoria.CULTURA,
                slot(DAY, "10:05", "11:05"));

        GeneratedAlternative alternative = generator.generate(DAY, DAY, TipoRitmo.INTENSIVO,
                Set.of(InteresCategoria.CULTURA), List.of(night, morning, noon)).get(1);

        assertThat(alternative.proposals()).extracting(ScheduledProposal::proposalId)
                .containsExactly(2L, 1L);
    }

    @Test
    void doesNotInsertAProposalThatWouldOverlapAnEventEndingAtMidnight() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(1, 10));
        CircuitCandidate festival = candidate(1L, "A Festival", InteresCategoria.CULTURA,
                slot(DAY, "12:00", "23:59"));
        CircuitCandidate afternoon = candidate(2L, "B Paseo", InteresCategoria.CULTURA,
                slot(DAY, "14:00", "15:00"));
        CircuitCandidate morning = candidate(3L, "C Museo", InteresCategoria.CULTURA,
                slot(DAY, "08:00", "09:00"));

        GeneratedAlternative alternative = generator.generate(DAY, DAY, TipoRitmo.EQUILIBRADO,
                Set.of(InteresCategoria.CULTURA), List.of(festival, afternoon, morning)).get(1);

        assertThat(alternative.proposals()).extracting(ScheduledProposal::proposalId)
                .containsExactly(3L, 1L);
    }

    @Test
    void manualRhythmRespectsPerDayEventAndActivityQuotasAcrossStrategies() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(1, 5));
        LocalDate day1 = LocalDate.of(2026, 10, 20);
        LocalDate day2 = LocalDate.of(2026, 10, 21);

        List<CircuitCandidate> candidates = List.of(
                candidate(1L, "Evento A", TipoRegistro.EVENTO, InteresCategoria.CULTURA,
                        slot(day1, "09:00", "10:00")),
                candidate(2L, "Evento B", TipoRegistro.EVENTO, InteresCategoria.CULTURA,
                        slot(day1, "11:00", "12:00")),
                candidate(3L, "Actividad A", TipoRegistro.ACTIVIDAD, InteresCategoria.CULTURA,
                        slot(day1, "13:00", "14:00")),
                candidate(4L, "Evento C", TipoRegistro.EVENTO, InteresCategoria.CULTURA,
                        slot(day2, "09:00", "10:00")),
                candidate(5L, "Actividad B", TipoRegistro.ACTIVIDAD, InteresCategoria.CULTURA,
                        slot(day2, "11:00", "12:00")),
                candidate(6L, "Actividad C", TipoRegistro.ACTIVIDAD, InteresCategoria.CULTURA,
                        slot(day2, "13:00", "14:00")),
                candidate(7L, "Actividad D", TipoRegistro.ACTIVIDAD, InteresCategoria.CULTURA,
                        slot(day2, "15:00", "16:00")));

        Map<LocalDate, DayQuota> quotas = Map.of(
                day1, new DayQuota(2, 1),
                day2, new DayQuota(1, 2));

        List<GeneratedAlternative> alternatives = generator.generate(day1, day2, TipoRitmo.MANUAL,
                Set.of(InteresCategoria.CULTURA), candidates, quotas, Set.of(), Map.of());

        assertThat(alternatives).hasSize(3);
        assertThat(alternatives)
                .extracting(alternative -> alternative.strategy().name())
                .containsExactlyInAnyOrder("CERCANIA", "INTERESES", "DESCUBRIMIENTO");

        for (GeneratedAlternative alternative : alternatives) {
            List<ScheduledProposal> day1Items = alternative.proposals().stream()
                    .filter(item -> item.date().equals(day1))
                    .toList();
            List<ScheduledProposal> day2Items = alternative.proposals().stream()
                    .filter(item -> item.date().equals(day2))
                    .toList();

            assertThat(day1Items.stream().filter(item -> item.type() == TipoRegistro.EVENTO).count())
                    .isEqualTo(2);
            assertThat(day1Items.stream().filter(item -> item.type() == TipoRegistro.ACTIVIDAD).count())
                    .isEqualTo(1);
            assertThat(day2Items.stream().filter(item -> item.type() == TipoRegistro.EVENTO).count())
                    .isEqualTo(1);
            assertThat(day2Items.stream().filter(item -> item.type() == TipoRegistro.ACTIVIDAD).count())
                    .isEqualTo(2);
        }
    }

    @Test
    void equilibradoRhythmAllowsUpToFourStopsPerDay() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(1, 5));
        LocalDate day = LocalDate.of(2026, 10, 20);

        List<CircuitCandidate> candidates = List.of(
                candidate(1L, "Evento A", TipoRegistro.EVENTO, InteresCategoria.CULTURA,
                        slot(day, "09:00", "10:00")),
                candidate(2L, "Evento B", TipoRegistro.EVENTO, InteresCategoria.CULTURA,
                        slot(day, "11:00", "12:00")),
                candidate(3L, "Evento C", TipoRegistro.EVENTO, InteresCategoria.CULTURA,
                        slot(day, "13:00", "14:00")),
                candidate(4L, "Actividad A", TipoRegistro.ACTIVIDAD, InteresCategoria.CULTURA,
                        slot(day, "15:00", "16:00")),
                candidate(5L, "Actividad B", TipoRegistro.ACTIVIDAD, InteresCategoria.CULTURA,
                        slot(day, "17:00", "18:00")),
                candidate(6L, "Actividad C", TipoRegistro.ACTIVIDAD, InteresCategoria.CULTURA,
                        slot(day, "18:30", "19:30")));

        List<GeneratedAlternative> alternatives = generator.generate(day, day, TipoRitmo.EQUILIBRADO,
                Set.of(InteresCategoria.CULTURA), candidates, Map.of(), Set.of(), Map.of());

        assertThat(alternatives).hasSize(3);
        for (GeneratedAlternative alternative : alternatives) {
            assertThat(alternative.proposals()).hasSize(4);
        }
    }

    @Test
    void intensivoRhythmAllowsUpToFiveStopsPerDay() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(1, 5));
        LocalDate day = LocalDate.of(2026, 10, 20);

        List<CircuitCandidate> candidates = List.of(
                candidate(1L, "P1", TipoRegistro.EVENTO, InteresCategoria.CULTURA, slot(day, "08:00", "09:00")),
                candidate(2L, "P2", TipoRegistro.EVENTO, InteresCategoria.CULTURA, slot(day, "09:30", "10:30")),
                candidate(3L, "P3", TipoRegistro.ACTIVIDAD, InteresCategoria.CULTURA, slot(day, "11:00", "12:00")),
                candidate(4L, "P4", TipoRegistro.ACTIVIDAD, InteresCategoria.CULTURA, slot(day, "12:30", "13:30")),
                candidate(5L, "P5", TipoRegistro.EVENTO, InteresCategoria.CULTURA, slot(day, "14:00", "15:00")),
                candidate(6L, "P6", TipoRegistro.ACTIVIDAD, InteresCategoria.CULTURA, slot(day, "15:30", "16:30")));

        List<GeneratedAlternative> alternatives = generator.generate(day, day, TipoRitmo.INTENSIVO,
                Set.of(InteresCategoria.CULTURA), candidates, Map.of(), Set.of(), Map.of());

        assertThat(alternatives).hasSize(3);
        for (GeneratedAlternative alternative : alternatives) {
            assertThat(alternative.proposals()).hasSize(5);
        }
    }

    @Test
    void manualRhythmLeavesEmptyDayWhenQuotaIsZero() {
        CircuitGenerator generator = new CircuitGenerator(new FixedDistanceProvider(1, 5));
        LocalDate day1 = LocalDate.of(2026, 10, 20);
        LocalDate day2 = LocalDate.of(2026, 10, 21);

        List<CircuitCandidate> candidates = List.of(
                candidate(1L, "Evento A", TipoRegistro.EVENTO, InteresCategoria.CULTURA,
                        slot(day1, "09:00", "10:00")),
                candidate(2L, "Actividad A", TipoRegistro.ACTIVIDAD, InteresCategoria.CULTURA,
                        slot(day2, "11:00", "12:00")));

        Map<LocalDate, DayQuota> quotas = Map.of(
                day1, new DayQuota(0, 0),
                day2, new DayQuota(0, 1));

        List<GeneratedAlternative> alternatives = generator.generate(day1, day2, TipoRitmo.MANUAL,
                Set.of(InteresCategoria.CULTURA), candidates, quotas, Set.of(), Map.of());

        for (GeneratedAlternative alternative : alternatives) {
            assertThat(alternative.proposals().stream().filter(item -> item.date().equals(day1))).isEmpty();
            assertThat(alternative.proposals().stream().filter(item -> item.date().equals(day2))).hasSize(1);
            assertThat(alternative.proposals().get(0).type()).isEqualTo(TipoRegistro.ACTIVIDAD);
        }
    }

    private CircuitCandidate candidate(Long id, String name, InteresCategoria category,
            CircuitCandidate.TimeSlot slot) {
        return candidate(id, name, TipoRegistro.ACTIVIDAD, category, slot);
    }

    private CircuitCandidate candidate(Long id, String name, TipoRegistro type, InteresCategoria category,
            CircuitCandidate.TimeSlot slot) {
        return new CircuitCandidate(id, name, null, type, category, -31.4, -64.2,
                List.of(slot), CircuitCandidate.ProposalDetails.empty());
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
