package com.viajesazo.turismo_backend.circuit;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.function.ToIntFunction;

import org.springframework.stereotype.Component;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRitmo;

@Component
public class CircuitGenerator {

    private static final LocalTime PLANNING_DAY_START = LocalTime.of(6, 0);
    private static final LocalTime PLANNING_DAY_END = LocalTime.of(23, 59);

    private final DistanceProvider distanceProvider;

    public CircuitGenerator(DistanceProvider distanceProvider) {
        this.distanceProvider = distanceProvider;
    }

    public List<GeneratedAlternative> generate(LocalDate start, LocalDate end, TipoRitmo rhythm,
            Set<InteresCategoria> interests, List<CircuitCandidate> candidates) {
        List<GeneratedAlternative> alternatives = new ArrayList<>();
        for (CircuitStrategy strategy : CircuitStrategy.values()) {
            alternatives.add(generateAlternative(start, end, rhythm, interests, candidates, strategy));
        }
        return alternatives;
    }

    private GeneratedAlternative generateAlternative(LocalDate start, LocalDate end, TipoRitmo rhythm,
            Set<InteresCategoria> interests, List<CircuitCandidate> candidates, CircuitStrategy strategy) {
        List<CircuitCandidate> remaining = new ArrayList<>(candidates);
        List<ScheduledProposal> scheduled = new ArrayList<>();
        Set<InteresCategoria> covered = new LinkedHashSet<>();
        double totalDistance = 0;
        int dailyLimit = dailyLimit(rhythm);

        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            LocalTime cursor = PLANNING_DAY_START;
            CircuitCandidate previous = null;
            int order = 1;
            while (order <= dailyLimit) {
                CircuitCandidate candidate = choose(remaining, previous, cursor, day, strategy, interests, covered);
                if (candidate == null) {
                    break;
                }
                CircuitCandidate.TimeSlot slot = slotFor(candidate, day, cursor, previous);
                if (slot == null) {
                    remaining.remove(candidate);
                    continue;
                }
                TravelEstimate transfer = previous == null ? new TravelEstimate(0, 0)
                        : distance(previous, candidate);
                LocalTime startTime = slot.start();
                LocalTime endTime = slot.end();
                scheduled.add(new ScheduledProposal(candidate.id(), candidate.name(), candidate.description(),
                        candidate.type(), candidate.category(), day, order, startTime, endTime,
                        transfer.distanceKm(), transfer.durationMinutes(), true, null, candidate.details()));
                totalDistance += transfer.distanceKm();
                cursor = endTime;
                previous = candidate;
                covered.add(candidate.category());
                remaining.remove(candidate);
                order++;
            }
        }

        String warning = scheduled.isEmpty()
                ? "No hay propuestas compatibles con las restricciones del viaje"
                : candidates.size() > 1 && scheduled.size() < 2
                        ? "Hay pocas propuestas compatibles con las restricciones del viaje"
                        : null;
        return new GeneratedAlternative(strategy, scheduled, totalDistance,
                affinity(scheduled, candidates, interests), covered, warning);
    }

    private CircuitCandidate choose(List<CircuitCandidate> candidates, CircuitCandidate previous,
            LocalTime cursor, LocalDate day, CircuitStrategy strategy, Set<InteresCategoria> interests,
            Set<InteresCategoria> covered) {
        List<CircuitCandidate> feasible = candidates.stream()
                .filter(candidate -> slotFor(candidate, day, cursor, previous) != null)
                .toList();
        if (feasible.isEmpty()) {
            return null;
        }
        Comparator<CircuitCandidate> comparator;
        if (strategy == CircuitStrategy.CERCANIA && previous != null) {
            comparator = Comparator.comparingDouble(candidate -> distance(previous, candidate).distanceKm());
        } else if (strategy == CircuitStrategy.DESCUBRIMIENTO) {
            comparator = Comparator
                    .comparing((CircuitCandidate candidate) -> covered.contains(candidate.category()))
                    .thenComparingInt(candidate -> availabilityCount(candidate))
                    .thenComparing(candidate -> candidate.name());
        } else {
            comparator = Comparator
                    .comparingInt((CircuitCandidate candidate) -> interestScore(candidate, interests)).reversed()
                    .thenComparing(candidate -> candidate.name());
        }
        return feasible.stream().sorted(comparator).findFirst().orElse(null);
    }

    private CircuitCandidate.TimeSlot slotFor(CircuitCandidate candidate, LocalDate day,
            LocalTime cursor, CircuitCandidate previous) {
        TravelEstimate transfer = previous == null ? new TravelEstimate(0, 0) : distance(previous, candidate);
        LocalTime earliestArrival = cursor.plusMinutes(transfer.durationMinutes());
        for (CircuitCandidate.TimeSlot slot : candidate.slots()) {
            if (!slot.date().equals(day)) {
                continue;
            }
            if (slot.start().isBefore(PLANNING_DAY_START) || slot.end().isAfter(PLANNING_DAY_END)) {
                continue;
            }
            if (slot.start().isBefore(earliestArrival)) {
                continue;
            }
            return slot;
        }
        return null;
    }

    private TravelEstimate distance(CircuitCandidate from, CircuitCandidate to) {
        return distanceProvider.estimate(from.latitude(), from.longitude(), to.latitude(), to.longitude());
    }

    private int interestScore(CircuitCandidate candidate, Set<InteresCategoria> interests) {
        return candidate.category() != null && interests.contains(candidate.category()) ? 1 : 0;
    }

    private double affinity(List<ScheduledProposal> scheduled, List<CircuitCandidate> candidates,
            Set<InteresCategoria> interests) {
        if (scheduled.isEmpty()) {
            return 0;
        }
        Set<Long> ids = scheduled.stream().map(ScheduledProposal::proposalId).collect(java.util.stream.Collectors.toSet());
        long matching = candidates.stream().filter(candidate -> ids.contains(candidate.id()))
                .filter(candidate -> candidate.category() != null && interests.contains(candidate.category())).count();
        return (double) matching / scheduled.size();
    }

    private int availabilityCount(CircuitCandidate candidate) {
        return candidate.slots().size();
    }

    private int dailyLimit(TipoRitmo rhythm) {
        return switch (rhythm) {
            case TRANQUILO -> 2;
            case EQUILIBRADO -> 3;
            case INTENSIVO -> 4;
        };
    }
}
