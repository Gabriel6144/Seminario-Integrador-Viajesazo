package com.viajesazo.turismo_backend.circuit;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.model.TipoRitmo;

@Component
public class CircuitGenerator {

	private static final LocalTime PLANNING_DAY_START = LocalTime.of(6, 0);
	private static final LocalTime PLANNING_DAY_END = LocalTime.of(23, 59);
	/** "Cerca de todo" agrupa por tramos de 500 m para que los Me gusta puedan desempatar. */
	private static final double NEARBY_STEP_KM = 0.5;

	private final DistanceProvider distanceProvider;

	public CircuitGenerator(DistanceProvider distanceProvider) {
		this.distanceProvider = distanceProvider;
	}

	public List<GeneratedAlternative> generate(LocalDate start, LocalDate end, TipoRitmo rhythm,
			Set<InteresCategoria> interests, List<CircuitCandidate> candidates) {
		return generate(start, end, rhythm, interests, candidates, Map.of(), Set.of(), Map.of());
	}

	public List<GeneratedAlternative> generate(LocalDate start, LocalDate end, TipoRitmo rhythm,
			Set<InteresCategoria> interests, List<CircuitCandidate> candidates,
			Map<LocalDate, DayQuota> dayQuotas, Set<Long> likedIds, Map<Long, Long> likeCounts) {
		Map<LocalDate, DayQuota> quotas = dayQuotas == null ? Map.of() : dayQuotas;
		Set<Long> liked = likedIds == null ? Set.of() : likedIds;
		Map<Long, Long> likes = likeCounts == null ? Map.of() : likeCounts;
		List<GeneratedAlternative> alternatives = new ArrayList<>();
		for (CircuitStrategy strategy : CircuitStrategy.values()) {
			alternatives.add(generateAlternative(start, end, rhythm, interests, candidates, strategy, quotas, liked,
					likes));
		}
		return alternatives;
	}

	private GeneratedAlternative generateAlternative(LocalDate start, LocalDate end, TipoRitmo rhythm,
			Set<InteresCategoria> interests, List<CircuitCandidate> candidates, CircuitStrategy strategy,
			Map<LocalDate, DayQuota> dayQuotas, Set<Long> likedIds, Map<Long, Long> likeCounts) {
		List<CircuitCandidate> remaining = new ArrayList<>(candidates);
		List<ScheduledProposal> scheduled = new ArrayList<>();
		Set<InteresCategoria> covered = new LinkedHashSet<>();
		double totalDistance = 0;
		boolean useTypeQuotas = rhythm == TipoRitmo.MANUAL;
		int defaultDailyLimit = useTypeQuotas ? 0 : dailyLimit(rhythm);
		Map<Long, CircuitCandidate> candidateById = candidates.stream()
				.collect(Collectors.toMap(CircuitCandidate::id, candidate -> candidate, (first, second) -> first));

		for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
			List<ScheduledProposal> dayItems = new ArrayList<>();
			LocalTime cursor = PLANNING_DAY_START;
			CircuitCandidate previous = null;
			int order = 1;

			if (useTypeQuotas) {
				DayQuota quota = dayQuotas.getOrDefault(day, new DayQuota(0, 0));
				int remainingEvents = Math.max(0, quota.events());
				int remainingActivities = Math.max(0, quota.activities());
				while (remainingEvents + remainingActivities > 0) {
					TipoRegistro preferred = remainingEvents > 0 ? TipoRegistro.EVENTO : TipoRegistro.ACTIVIDAD;
					CircuitCandidate candidate = choose(remaining, previous, cursor, day, strategy, interests, covered,
							likedIds, likeCounts, preferred);
					if (candidate == null && preferred == TipoRegistro.EVENTO && remainingActivities > 0) {
						candidate = choose(remaining, previous, cursor, day, strategy, interests, covered, likedIds,
								likeCounts, TipoRegistro.ACTIVIDAD);
					} else if (candidate == null && preferred == TipoRegistro.ACTIVIDAD && remainingEvents > 0) {
						candidate = choose(remaining, previous, cursor, day, strategy, interests, covered, likedIds,
								likeCounts, TipoRegistro.EVENTO);
					}
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
					if (candidate.type() == TipoRegistro.EVENTO) {
						remainingEvents = Math.max(0, remainingEvents - 1);
					} else {
						remainingActivities = Math.max(0, remainingActivities - 1);
					}
					order++;
				}
			} else {
				while (order <= defaultDailyLimit) {
					CircuitCandidate candidate = choose(remaining, previous, cursor, day, strategy, interests, covered,
							likedIds, likeCounts, null);
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
				if (dayItems.size() < defaultDailyLimit) {
					compactDay(day, dayItems, remaining, defaultDailyLimit, covered, candidateById);
				}
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
			Set<InteresCategoria> covered, Set<Long> likedIds, Map<Long, Long> likeCounts, TipoRegistro requiredType) {
		List<CircuitCandidate> feasible = candidates.stream()
				.filter(candidate -> requiredType == null || candidate.type() == requiredType)
				.filter(candidate -> slotFor(candidate, day, cursor, previous) != null)
				.toList();
		if (feasible.isEmpty()) {
			return null;
		}
		// Los Me gusta del turista y la popularidad deciden ANTES del desempate por nombre o por la
		// distancia exacta; si no, en la práctica nunca llegaban a pesar.
		Comparator<CircuitCandidate> likedFirst = Comparator
				.comparing((CircuitCandidate candidate) -> !likedIds.contains(candidate.id()));
		Comparator<CircuitCandidate> popularFirst = Comparator
				.comparingLong((CircuitCandidate candidate) -> -likeCounts.getOrDefault(candidate.id(), 0L));
		Comparator<CircuitCandidate> comparator;
		if (strategy == CircuitStrategy.CERCANIA && previous != null) {
			// "Cerca de todo": por tramos de distancia; dentro del tramo gana lo que le gustó.
			comparator = Comparator
					.comparingDouble((CircuitCandidate candidate) ->
							Math.floor(distance(previous, candidate).distanceKm() / NEARBY_STEP_KM))
					.thenComparing(likedFirst)
					.thenComparing(popularFirst)
					.thenComparingDouble((CircuitCandidate candidate) -> distance(previous, candidate).distanceKm());
		} else if (strategy == CircuitStrategy.DESCUBRIMIENTO) {
			comparator = Comparator
					.comparing((CircuitCandidate candidate) -> covered.contains(candidate.category()))
					.thenComparing(likedFirst)
					.thenComparingInt(this::availabilityCount)
					.thenComparing(popularFirst)
					.thenComparing(CircuitCandidate::name);
		} else {
			// "Según tus intereses" (y la primera parada de "Cerca de todo"): intereses, Me gusta del
			// turista y popularidad. Antes, como todas las candidatas ya son de sus intereses, quedaba
			// en orden alfabético.
			comparator = Comparator
					.comparingInt((CircuitCandidate candidate) -> interestScore(candidate, interests)).reversed()
					.thenComparing(likedFirst)
					.thenComparing(popularFirst)
					.thenComparing(CircuitCandidate::name);
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
		Set<Long> ids = scheduled.stream().map(ScheduledProposal::proposalId).collect(Collectors.toSet());
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
			case EQUILIBRADO -> 4;
			case INTENSIVO -> 5;
			case MANUAL -> 0;
		};
	}
}
