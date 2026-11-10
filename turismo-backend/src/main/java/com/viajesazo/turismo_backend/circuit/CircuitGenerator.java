package com.viajesazo.turismo_backend.circuit;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.ToIntFunction;
import java.util.stream.Collectors;

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
		Map<Long, CircuitCandidate> candidateById = candidates.stream()
				.collect(Collectors.toMap(CircuitCandidate::id, candidate -> candidate, (first, second) -> first));

		for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
			List<ScheduledProposal> dayItems = new ArrayList<>();
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
				dayItems.add(new ScheduledProposal(candidate.id(), candidate.name(), candidate.description(),
						candidate.type(), candidate.category(), day, order, slot.start(), slot.end(),
						transfer.distanceKm(), transfer.durationMinutes(), true, null, candidate.details()));
				cursor = slot.end();
				previous = candidate;
				covered.add(candidate.category());
				remaining.remove(candidate);
				order++;
			}
			if (dayItems.size() < dailyLimit) {
				compactDay(day, dayItems, remaining, dailyLimit, covered, candidateById);
			}
			normalizeDay(dayItems, candidateById);
			for (ScheduledProposal item : dayItems) {
				scheduled.add(item);
				totalDistance += item.transferDistanceKm();
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

	/**
	 * Completa un día que la estrategia dejó corto: recorre las propuestas no usadas y las inserta
	 * en los huecos libres, respetando el tope diario, los solapamientos y los traslados. No
	 * descarta las paradas ya elegidas por la estrategia.
	 */
	private void compactDay(LocalDate day, List<ScheduledProposal> dayItems, List<CircuitCandidate> remaining,
			int dailyLimit, Set<InteresCategoria> covered, Map<Long, CircuitCandidate> candidateById) {
		record CandidateSlot(CircuitCandidate candidate, CircuitCandidate.TimeSlot slot) {
		}
		List<CandidateSlot> ordered = remaining.stream()
				.map(candidate -> new CandidateSlot(candidate, slotOnDay(candidate, day)))
				.filter(candidateSlot -> candidateSlot.slot() != null)
				.sorted(Comparator.comparing(candidateSlot -> candidateSlot.slot().start()))
				.toList();
		for (CandidateSlot candidateSlot : ordered) {
			if (dayItems.size() >= dailyLimit) {
				return;
			}
			CircuitCandidate candidate = candidateSlot.candidate();
			CircuitCandidate.TimeSlot slot = candidateSlot.slot();
			int index = insertionIndex(dayItems, slot.start());
			ScheduledProposal previous = index > 0 ? dayItems.get(index - 1) : null;
			ScheduledProposal next = index < dayItems.size() ? dayItems.get(index) : null;
			if (previous != null && !fitsAfter(previous, candidate, slot, candidateById)) {
				continue;
			}
			if (next != null && !fitsBefore(candidate, slot, next, candidateById)) {
				continue;
			}
			CircuitCandidate previousCandidate = previous == null ? null : candidateById.get(previous.proposalId());
			TravelEstimate transfer = previousCandidate == null ? new TravelEstimate(0, 0)
					: distance(previousCandidate, candidate);
			dayItems.add(index, new ScheduledProposal(candidate.id(), candidate.name(), candidate.description(),
					candidate.type(), candidate.category(), day, 0, slot.start(), slot.end(),
					transfer.distanceKm(), transfer.durationMinutes(), true, null, candidate.details()));
			remaining.remove(candidate);
			if (candidate.category() != null) {
				covered.add(candidate.category());
			}
		}
	}

	/**
	 * Reordena el día por horario, renumera {@code order} y recalcula cada traslado desde la parada
	 * anterior. La compactación puede insertar paradas en el medio, así que los traslados no se
	 * pueden dejar como los calculó la pasada por estrategia.
	 */
	private void normalizeDay(List<ScheduledProposal> dayItems, Map<Long, CircuitCandidate> candidateById) {
		dayItems.sort(Comparator.comparing(ScheduledProposal::start));
		List<ScheduledProposal> normalized = new ArrayList<>();
		for (int index = 0; index < dayItems.size(); index++) {
			ScheduledProposal item = dayItems.get(index);
			TravelEstimate transfer = new TravelEstimate(0, 0);
			if (index > 0) {
				CircuitCandidate previous = candidateById.get(dayItems.get(index - 1).proposalId());
				CircuitCandidate current = candidateById.get(item.proposalId());
				if (previous != null && current != null) {
					transfer = distance(previous, current);
				}
			}
			normalized.add(new ScheduledProposal(item.proposalId(), item.proposalName(), item.description(),
					item.type(), item.category(), item.date(), index + 1, item.start(), item.end(),
					transfer.distanceKm(), transfer.durationMinutes(), item.available(), item.unavailableReason(),
					item.details()));
		}
		dayItems.clear();
		dayItems.addAll(normalized);
	}

	private int insertionIndex(List<ScheduledProposal> dayItems, LocalTime start) {
		int index = 0;
		while (index < dayItems.size() && dayItems.get(index).start().isBefore(start)) {
			index++;
		}
		return index;
	}

    private boolean fitsAfter(ScheduledProposal previous, CircuitCandidate candidate,
            CircuitCandidate.TimeSlot slot, Map<Long, CircuitCandidate> candidateById) {
        CircuitCandidate previousCandidate = candidateById.get(previous.proposalId());
        if (previousCandidate == null) {
            return true;
        }
        TravelEstimate transfer = distance(previousCandidate, candidate);
        return minuteOfDay(slot.start()) >= minuteOfDay(previous.end()) + transfer.durationMinutes();
    }

    private boolean fitsBefore(CircuitCandidate candidate, CircuitCandidate.TimeSlot slot,
            ScheduledProposal next, Map<Long, CircuitCandidate> candidateById) {
        CircuitCandidate nextCandidate = candidateById.get(next.proposalId());
        if (nextCandidate == null) {
            return true;
        }
        TravelEstimate transfer = distance(candidate, nextCandidate);
        return minuteOfDay(slot.end()) + transfer.durationMinutes() <= minuteOfDay(next.start());
    }

	private CircuitCandidate.TimeSlot slotOnDay(CircuitCandidate candidate, LocalDate day) {
		for (CircuitCandidate.TimeSlot slot : candidate.slots()) {
			if (!slot.date().equals(day)) {
				continue;
			}
			if (slot.start().isBefore(PLANNING_DAY_START) || slot.end().isAfter(PLANNING_DAY_END)) {
				continue;
			}
			return slot;
		}
		return null;
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
        int earliestArrival = minuteOfDay(cursor) + transfer.durationMinutes();
        for (CircuitCandidate.TimeSlot slot : candidate.slots()) {
            if (!slot.date().equals(day)) {
                continue;
            }
            if (slot.start().isBefore(PLANNING_DAY_START) || slot.end().isAfter(PLANNING_DAY_END)) {
                continue;
            }
            if (minuteOfDay(slot.start()) < earliestArrival) {
                continue;
            }
            return slot;
        }
        return null;
    }

    private static int minuteOfDay(LocalTime time) {
        return time.getHour() * 60 + time.getMinute();
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
