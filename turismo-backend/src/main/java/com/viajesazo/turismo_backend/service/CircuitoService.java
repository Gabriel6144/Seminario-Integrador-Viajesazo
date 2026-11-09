package com.viajesazo.turismo_backend.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viajesazo.turismo_backend.circuit.CircuitCandidate;
import com.viajesazo.turismo_backend.circuit.CircuitGenerator;
import com.viajesazo.turismo_backend.circuit.GeneratedAlternative;
import com.viajesazo.turismo_backend.circuit.DistanceProvider;
import com.viajesazo.turismo_backend.circuit.ScheduledProposal;
import com.viajesazo.turismo_backend.circuit.TravelEstimate;
import com.viajesazo.turismo_backend.dto.request.ReemplazoItemCircuitoRequest;
import com.viajesazo.turismo_backend.dto.request.SeleccionCircuitoRequest;
import com.viajesazo.turismo_backend.dto.response.AlternativaItemResponse;
import com.viajesazo.turismo_backend.dto.response.AlternativaReemplazoResponse;
import com.viajesazo.turismo_backend.dto.response.AlternativasReemplazoResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoAlternativaResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoItemResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoSeleccionadoResponse;
import com.viajesazo.turismo_backend.dto.response.DiaCircuitoResponse;
import com.viajesazo.turismo_backend.dto.response.GeneracionCircuitoResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.CircuitoDataMissingException;
import com.viajesazo.turismo_backend.exception.ConfirmationRequiredException;
import com.viajesazo.turismo_backend.exception.InvariantViolationException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.CircuitStrategy;
import com.viajesazo.turismo_backend.model.Circuito;
import com.viajesazo.turismo_backend.model.CircuitoAlternativa;
import com.viajesazo.turismo_backend.model.CircuitoItem;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.NombreEstado;
import com.viajesazo.turismo_backend.model.PropuestaTuristica;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.repository.CircuitoRepository;
import com.viajesazo.turismo_backend.repository.PropuestaRepository;
import com.viajesazo.turismo_backend.repository.ViajeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CircuitoService {

    private static final LocalTime EVENT_START = LocalTime.of(9, 0);
    private static final LocalTime EVENT_END = LocalTime.of(18, 0);
    private static final List<NombreEstado> INACTIVE_STATES = List.of(NombreEstado.CANCELADO, NombreEstado.FINALIZADO);

    private final CircuitoRepository circuitoRepository;
    private final ViajeRepository viajeRepository;
    private final PropuestaRepository propuestaRepository;
    private final CircuitGenerator generator;
    private final DistanceProvider distanceProvider;
    private final Clock clock;

    public record GenerationResult(GeneracionCircuitoResponse response, boolean replaced) {
    }

    private record AlternativeOption(CircuitCandidate candidate, LocalTime start, LocalTime end) {
    }

    @Transactional
    public GenerationResult generate(Long viajeId, boolean reemplazar) {
        Viaje viaje = findTrip(viajeId);
        validateTrip(viaje);
        Circuito existing = circuitoRepository.findByViajeId(viajeId).orElse(null);
        if (existing != null && !reemplazar) {
            throw new ConfirmationRequiredException(
                    "el circuito del viaje ya fue generado; confirmá con reemplazar=true para regenerarlo");
        }

        LocalDate start = effectiveStart(viaje);
        List<CircuitCandidate> candidates = candidates(viaje, start);
        if (candidates.isEmpty()) {
            throw new InvariantViolationException(
                    "no hay propuestas compatibles con los intereses y el radio de interés del viaje");
        }
        Set<InteresCategoria> interests = new LinkedHashSet<>(viaje.getInteresesCategoria());
        List<GeneratedAlternative> generated = generator.generate(start, viaje.getFechaFin(),
                viaje.getRitmo(), interests, candidates);
        if (generated.stream().allMatch(alternative -> alternative.proposals().isEmpty())) {
            throw new InvariantViolationException(
                    "no hay propuestas compatibles con los intereses y el radio de interés del viaje");
        }

        CircuitStrategy previousStrategy = existing == null ? null : existing.getEstrategiaSeleccionada();
        Circuito circuito = existing == null ? new Circuito() : existing;
        if (existing == null) {
            circuito.setViaje(viaje);
        } else {
            circuito.getAlternativas().clear();
        }
        circuito.setGeneradoEn(LocalDateTime.now(clock));
        circuito.setDistanciasEstimadas(distanceProvider.estimated());
        circuito.setAdvertencia(similarityWarning(generated));
        circuito.setEstrategiaSeleccionada(previousStrategy != null && generated.stream()
                .anyMatch(alternative -> alternative.strategy().name().equals(previousStrategy.name()))
                        ? previousStrategy : null);
        for (GeneratedAlternative alternative : generated) {
            circuito.addAlternativa(toEntity(alternative));
        }
        snapshot(circuito, viaje);
        try {
            circuitoRepository.saveAndFlush(circuito);
        } catch (DataIntegrityViolationException ex) {
            throw new ConfirmationRequiredException(
                    "el circuito del viaje ya fue generado; confirmá con reemplazar=true para regenerarlo");
        }
        return new GenerationResult(toGenerationResponse(circuito), existing != null);
    }

    @Transactional
    public GeneracionCircuitoResponse select(Long viajeId, SeleccionCircuitoRequest request) {
        Circuito circuito = findCircuit(viajeId);
        if (circuito.getEstrategiaSeleccionada() != null) {
            throw new BusinessRuleException("el circuito del viaje ya tiene una alternativa seleccionada");
        }
        boolean exists = circuito.getAlternativas().stream()
                .anyMatch(alternative -> alternative.getEstrategia() == request.estrategia());
        if (!exists) {
            throw new BusinessRuleException("la alternativa seleccionada no existe en el circuito generado");
        }
        circuito.setEstrategiaSeleccionada(request.estrategia());
        return toGenerationResponse(circuitoRepository.save(circuito));
    }

    @Transactional(readOnly = true)
    public GeneracionCircuitoResponse find(Long viajeId) {
        Circuito circuito = findCircuit(viajeId);
        refreshAvailability(circuito);
        return toGenerationResponse(circuito);
    }

    @Transactional(readOnly = true)
    public CircuitoResponse selected(Long viajeId) {
        Circuito circuito = circuitoRepository.findByViajeId(viajeId).orElse(null);
        if (circuito == null || circuito.getEstrategiaSeleccionada() == null) {
            return null;
        }
        refreshAvailability(circuito);
        CircuitoAlternativa alternative = circuito.getAlternativas().stream()
                .filter(item -> item.getEstrategia() == circuito.getEstrategiaSeleccionada())
                .findFirst()
                .orElse(null);
        if (alternative == null) {
            return null;
        }
        List<String> motivos = staleReasons(circuito);
        return new CircuitoResponse(
                circuito.getGeneradoEn(), circuito.getEstrategiaSeleccionada(), toResponse(alternative),
                circuito.isDistanciasEstimadas(), circuito.getAdvertencia(), !motivos.isEmpty(), motivos);
    }

    @Transactional(readOnly = true)
    public CircuitoSeleccionadoResponse selectedDetail(Long viajeId) {
        findTrip(viajeId);
        return selectedResponse(findCircuit(viajeId), viajeId);
    }

    @Transactional
    public CircuitoSeleccionadoResponse deleteSelectedItem(Long viajeId, Long itemId, boolean confirmar) {
        findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = selectedAlternative(circuito);
        CircuitoItem item = selectedItem(alternative, itemId);
        if (!confirmar) {
            throw new ConfirmationRequiredException(
                    "la eliminación de la parada requiere confirmación; confirmá con confirmar=true");
        }

        LocalDate date = item.getFecha();
        int removedIndex = sortedDayItems(alternative, date).indexOf(item);
        alternative.getItems().remove(item);
        renumberDay(alternative, date);
        recalculateTransferAfterRemoval(alternative, date, removedIndex);
        recalculateMetrics(circuito, alternative);
        circuitoRepository.save(circuito);
        return selectedResponse(circuito, viajeId);
    }

    @Transactional(readOnly = true)
    public AlternativasReemplazoResponse replacementAlternatives(Long viajeId, Long itemId) {
        Viaje viaje = findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = selectedAlternative(circuito);
        CircuitoItem target = selectedItem(alternative, itemId);
        List<AlternativaReemplazoResponse> alternativas = replacementOptions(viaje, alternative, target).stream()
                .map(this::toReplacementResponse)
                .toList();
        return new AlternativasReemplazoResponse(alternativas, alternativas.isEmpty()
                ? "No hay propuestas que entren en el bloque horario sin romper el itinerario"
                : null);
    }

    @Transactional
    public CircuitoSeleccionadoResponse replaceSelectedItem(Long viajeId, Long itemId,
            ReemplazoItemCircuitoRequest request) {
        Viaje viaje = findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = selectedAlternative(circuito);
        CircuitoItem target = selectedItem(alternative, itemId);
        AlternativeOption option = replacementOptions(viaje, alternative, target).stream()
                .filter(candidate -> request.propuestaId().equals(candidate.candidate().id()))
                .findFirst()
                .orElseThrow(() -> new InvariantViolationException(
                        "la propuesta elegida no es un reemplazo válido para esta parada"));

        applyCandidate(target, option.candidate(), option.start(), option.end());
        recalculateTransfersAround(alternative, target);
        recalculateMetrics(circuito, alternative);
        circuitoRepository.save(circuito);
        return selectedResponse(circuito, viajeId);
    }

    private CircuitoItem selectedItem(CircuitoAlternativa alternative, Long itemId) {
        return alternative.getItems().stream()
                .filter(candidate -> itemId.equals(candidate.getId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe la parada con id " + itemId + " en el circuito seleccionado"));
    }

    private CircuitoSeleccionadoResponse selectedResponse(Circuito circuito, Long viajeId) {
        CircuitoAlternativa alternative = selectedAlternative(circuito);
        LocalDate start = selectedStart(circuito, alternative);
        LocalDate end = selectedEnd(circuito, alternative);
        List<String> motivos = staleReasons(circuito);
        return new CircuitoSeleccionadoResponse(
                circuito.getId(), viajeId, circuito.getGeneradoEn(), circuito.getEstrategiaSeleccionada(),
                !motivos.isEmpty(), motivos, circuito.isDistanciasEstimadas(), circuito.getAdvertencia(),
                selectedDays(alternative, start, end));
    }

    private CircuitoAlternativa selectedAlternative(Circuito circuito) {
        if (circuito.getEstrategiaSeleccionada() == null) {
            throw new ResourceNotFoundException(
                    "El circuito del viaje todavía no tiene una alternativa seleccionada");
        }
        return circuito.getAlternativas().stream()
                .filter(item -> item.getEstrategia() == circuito.getEstrategiaSeleccionada())
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "La alternativa seleccionada ya no existe en el circuito"));
    }

    private LocalDate selectedStart(Circuito circuito, CircuitoAlternativa alternative) {
        if (circuito.getFechaInicioSnapshot() != null) {
            return circuito.getFechaInicioSnapshot();
        }
        return alternative.getItems().stream()
                .map(CircuitoItem::getFecha)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElseGet(() -> circuito.getViaje() == null ? null : circuito.getViaje().getFechaInicio());
    }

    private LocalDate selectedEnd(Circuito circuito, CircuitoAlternativa alternative) {
        if (circuito.getFechaFinSnapshot() != null) {
            return circuito.getFechaFinSnapshot();
        }
        return alternative.getItems().stream()
                .map(CircuitoItem::getFecha)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElseGet(() -> circuito.getViaje() == null ? null : circuito.getViaje().getFechaFin());
    }

    private List<DiaCircuitoResponse> selectedDays(CircuitoAlternativa alternative, LocalDate start, LocalDate end) {
        Map<LocalDate, List<CircuitoItem>> byDate = alternative.getItems().stream()
                .filter(item -> item.getFecha() != null)
                .collect(Collectors.groupingBy(CircuitoItem::getFecha));
        List<DiaCircuitoResponse> days = new ArrayList<>();
        if (start == null || end == null || end.isBefore(start)) {
            byDate.keySet().stream().sorted().forEach(date -> days.add(selectedDay(date, byDate.get(date))));
            return days;
        }
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            days.add(selectedDay(date, byDate.get(date)));
        }
        return days;
    }

    private DiaCircuitoResponse selectedDay(LocalDate date, List<CircuitoItem> items) {
        List<AlternativaItemResponse> responses = items == null ? List.of()
                : items.stream()
                        .sorted(itemOrder())
                        .map(item -> new AlternativaItemResponse(item.getId(), item.getPropuestaId(),
                                item.getPropuestaNombre(), item.getTipo(), item.getCategoria(), item.getCiudad(),
                                item.getLocalidad(), item.getDireccion(), item.getHoraInicio(), item.getHoraFin(),
                                item.getDuracionMinutos() != null
                                        ? item.getDuracionMinutos()
                                        : durationMinutes(item.getHoraInicio(), item.getHoraFin())))
                        .toList();
        return new DiaCircuitoResponse(date, responses);
    }

    private Comparator<CircuitoItem> itemOrder() {
        return Comparator
                .<CircuitoItem, LocalTime>comparing(CircuitoItem::getHoraInicio,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparingInt(CircuitoItem::getOrden);
    }

    private List<CircuitoItem> sortedDayItems(CircuitoAlternativa alternative, LocalDate date) {
        return alternative.getItems().stream()
                .filter(item -> date.equals(item.getFecha()))
                .sorted(itemOrder())
                .toList();
    }

    private void renumberDay(CircuitoAlternativa alternative, LocalDate date) {
        List<CircuitoItem> items = sortedDayItems(alternative, date);
        for (int index = 0; index < items.size(); index++) {
            items.get(index).setOrden(index + 1);
        }
    }

    private void recalculateTransferAfterRemoval(CircuitoAlternativa alternative, LocalDate date, int removedIndex) {
        List<CircuitoItem> items = sortedDayItems(alternative, date);
        if (removedIndex < 0 || removedIndex >= items.size()) {
            return;
        }
        CircuitoItem next = items.get(removedIndex);
        if (removedIndex == 0) {
            next.setTrasladoKm(0);
            next.setTrasladoMinutos(0);
            return;
        }
        applyTransfer(items.get(removedIndex - 1), next);
    }

    private void applyTransfer(CircuitoItem from, CircuitoItem to) {
        if (!hasCoordinates(from) || !hasCoordinates(to)) {
            to.setTrasladoKm(0);
            to.setTrasladoMinutos(0);
            return;
        }
        TravelEstimate transfer = distanceProvider.estimate(
                from.getLatitud().doubleValue(), from.getLongitud().doubleValue(),
                to.getLatitud().doubleValue(), to.getLongitud().doubleValue());
        to.setTrasladoKm(transfer.distanceKm());
        to.setTrasladoMinutos(transfer.durationMinutes());
    }

    private boolean hasCoordinates(CircuitoItem item) {
        return item.getLatitud() != null && item.getLongitud() != null;
    }

    private void recalculateMetrics(Circuito circuito, CircuitoAlternativa alternative) {
        List<CircuitoItem> items = alternative.getItems();
        alternative.setDistanciaTotalKm(items.stream().mapToDouble(CircuitoItem::getTrasladoKm).sum());

        Set<InteresCategoria> interests = new LinkedHashSet<>(circuito.getInteresesCategoriaSnapshot() == null
                ? List.of() : circuito.getInteresesCategoriaSnapshot());
        long matching = items.stream()
                .filter(item -> item.getCategoria() != null && interests.contains(item.getCategoria()))
                .count();
        alternative.setAfinidadIntereses(items.isEmpty() ? 0 : (double) matching / items.size());

        List<InteresCategoria> categories = items.stream()
                .map(CircuitoItem::getCategoria)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        alternative.setCategoriasCubiertas(new ArrayList<>(categories));
    }

    private List<AlternativeOption> replacementOptions(Viaje viaje, CircuitoAlternativa alternative,
            CircuitoItem target) {
        if (target.getFecha() == null || target.getHoraInicio() == null || target.getHoraFin() == null) {
            return List.of();
        }
        Set<Long> used = alternative.getItems().stream()
                .map(CircuitoItem::getPropuestaId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        List<AlternativeOption> options = new ArrayList<>();
        for (PropuestaTuristica proposal : propuestaRepository.findAll()) {
            if (proposal.getId() == null || used.contains(proposal.getId()) || !isEligible(viaje, proposal)) {
                continue;
            }
            for (CircuitCandidate.TimeSlot slot : proposalSlots(proposal, target.getFecha())) {
                if (slot.start().isBefore(target.getHoraInicio()) || slot.end().isAfter(target.getHoraFin())) {
                    continue;
                }
                if (overlapsAnotherItem(alternative, target, slot.start(), slot.end())) {
                    continue;
                }
                if (!transfersFit(alternative, target, proposal, slot.start(), slot.end())) {
                    continue;
                }
                options.add(new AlternativeOption(toCandidate(proposal, List.of(slot)), slot.start(), slot.end()));
                break;
            }
        }
        options.sort(Comparator.comparing(option -> option.candidate().name(),
                Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));
        return options;
    }

    private boolean isEligible(Viaje viaje, PropuestaTuristica proposal) {
        NombreEstado state = proposal.getNombreEstado();
        if (state == null || INACTIVE_STATES.contains(state)) {
            return false;
        }
        Ubicacion location = proposal.getUbicacion();
        if (location == null || location.getLatitud() == null || location.getLongitud() == null) {
            return false;
        }
        Ubicacion zone = viaje.getZonaInteres();
        if (zone == null || zone.getLatitud() == null || zone.getLongitud() == null
                || viaje.getRangoInteresKm() == null || viaje.getInteresesCategoria() == null
                || proposal.getCategoria() == null
                || !viaje.getInteresesCategoria().contains(proposal.getCategoria())) {
            return false;
        }
        double distance = distanceProvider.estimate(
                zone.getLatitud().doubleValue(), zone.getLongitud().doubleValue(),
                location.getLatitud().doubleValue(), location.getLongitud().doubleValue()).distanceKm();
        return distance <= viaje.getRangoInteresKm();
    }

    private List<CircuitCandidate.TimeSlot> proposalSlots(PropuestaTuristica proposal, LocalDate date) {
        if (proposal instanceof Evento event) {
            if (event.getFechaInicio() == null || event.getFechaFin() == null
                    || date.isBefore(event.getFechaInicio()) || date.isAfter(event.getFechaFin())) {
                return List.of();
            }
            LocalTime start = event.getHorarioInicio() == null || event.getHorarioFin() == null
                    ? EVENT_START : event.getHorarioInicio();
            LocalTime end = event.getHorarioInicio() == null || event.getHorarioFin() == null
                    ? EVENT_END : event.getHorarioFin();
            return List.of(new CircuitCandidate.TimeSlot(date, start, end));
        }
        if (proposal instanceof Actividad activity) {
            if (activity.getDisponibilidades() == null) {
                return List.of();
            }
            List<CircuitCandidate.TimeSlot> slots = new ArrayList<>();
            for (var availability : activity.getDisponibilidades()) {
                if (availability.getDiaSemana() != date.getDayOfWeek()) {
                    continue;
                }
                LocalTime end = availability.getHoraInicio().plusMinutes(activity.getDuracionMinutos());
                if (end.isAfter(availability.getHoraFin())) {
                    continue;
                }
                slots.add(new CircuitCandidate.TimeSlot(date, availability.getHoraInicio(), end));
            }
            return slots;
        }
        return List.of();
    }

    private boolean overlapsAnotherItem(CircuitoAlternativa alternative, CircuitoItem target,
            LocalTime start, LocalTime end) {
        return alternative.getItems().stream()
                .filter(item -> !Objects.equals(target.getId(), item.getId()))
                .filter(item -> Objects.equals(target.getFecha(), item.getFecha()))
                .filter(item -> item.getHoraInicio() != null && item.getHoraFin() != null)
                .anyMatch(item -> start.isBefore(item.getHoraFin()) && end.isAfter(item.getHoraInicio()));
    }

    private boolean transfersFit(CircuitoAlternativa alternative, CircuitoItem target,
            PropuestaTuristica proposal, LocalTime start, LocalTime end) {
        List<CircuitoItem> ordered = sortedDayItems(alternative, target.getFecha());
        int index = ordered.indexOf(target);
        if (index < 0) {
            return false;
        }
        Ubicacion location = proposal.getUbicacion();
        if (index > 0) {
            CircuitoItem previous = ordered.get(index - 1);
            if (previous.getHoraFin() != null && hasCoordinates(previous)) {
                int minutes = distanceProvider.estimate(
                        previous.getLatitud().doubleValue(), previous.getLongitud().doubleValue(),
                        location.getLatitud().doubleValue(), location.getLongitud().doubleValue())
                        .durationMinutes();
                if (start.isBefore(previous.getHoraFin().plusMinutes(minutes))) {
                    return false;
                }
            }
        }
        if (index + 1 < ordered.size()) {
            CircuitoItem next = ordered.get(index + 1);
            if (next.getHoraInicio() != null && hasCoordinates(next)) {
                int minutes = distanceProvider.estimate(
                        location.getLatitud().doubleValue(), location.getLongitud().doubleValue(),
                        next.getLatitud().doubleValue(), next.getLongitud().doubleValue())
                        .durationMinutes();
                if (next.getHoraInicio().isBefore(end.plusMinutes(minutes))) {
                    return false;
                }
            }
        }
        return true;
    }

    private CircuitCandidate toCandidate(PropuestaTuristica proposal,
            List<CircuitCandidate.TimeSlot> slots) {
        Ubicacion location = proposal.getUbicacion();
        Evento event = proposal instanceof Evento value ? value : null;
        Actividad activity = proposal instanceof Actividad value ? value : null;
        CircuitCandidate.ProposalDetails details = new CircuitCandidate.ProposalDetails(
                proposal.getImagenes(), location.getCiudad(), location.getLocalidad(),
                location.getDireccion(), proposal.getLugarRecinto(), location.getLatitud(),
                location.getLongitud(), proposal.getTipoAcceso(),
                event == null ? null : event.getMontoEstimado(),
                event == null ? null : event.getDescripcionArancel(),
                event == null ? null : event.getSitioOficial(),
                activity == null ? null : activity.getDuracionMinutos());
        return new CircuitCandidate(proposal.getId(), proposal.getNombre(), proposal.getDescripcion(),
                proposal.getTipo(), proposal.getCategoria(), location.getLatitud().doubleValue(),
                location.getLongitud().doubleValue(), slots, details);
    }

    private AlternativaReemplazoResponse toReplacementResponse(AlternativeOption option) {
        CircuitCandidate candidate = option.candidate();
        CircuitCandidate.ProposalDetails details = candidate.details();
        return new AlternativaReemplazoResponse(candidate.id(), candidate.name(), candidate.type(),
                candidate.category(), details.city(), details.locality(), details.address(),
                option.start(), option.end(),
                details.durationMinutes() != null ? details.durationMinutes()
                        : durationMinutes(option.start(), option.end()));
    }

    private void applyCandidate(CircuitoItem item, CircuitCandidate candidate, LocalTime start, LocalTime end) {
        CircuitCandidate.ProposalDetails details = candidate.details();
        item.setPropuestaId(candidate.id());
        item.setPropuestaNombre(candidate.name());
        item.setDescripcion(candidate.description());
        item.setCategoria(candidate.category());
        item.setTipo(candidate.type());
        item.setHoraInicio(start);
        item.setHoraFin(end);
        item.setDisponible(true);
        item.setMotivoNoDisponible(null);
        applyDetails(item, details);
        item.setDuracionMinutos(details.durationMinutes() != null
                ? details.durationMinutes() : durationMinutes(start, end));
    }

    private void recalculateTransfersAround(CircuitoAlternativa alternative, CircuitoItem item) {
        List<CircuitoItem> ordered = sortedDayItems(alternative, item.getFecha());
        int index = ordered.indexOf(item);
        if (index <= 0) {
            item.setTrasladoKm(0);
            item.setTrasladoMinutos(0);
        } else {
            applyTransfer(ordered.get(index - 1), item);
        }
        if (index >= 0 && index + 1 < ordered.size()) {
            applyTransfer(item, ordered.get(index + 1));
        }
    }

    private void applyDetails(CircuitoItem item, CircuitCandidate.ProposalDetails details) {
        item.setImagenes(new ArrayList<>(details.images()));
        item.setCiudad(details.city());
        item.setLocalidad(details.locality());
        item.setDireccion(details.address());
        item.setLugarRecinto(details.venue());
        item.setLatitud(details.latitude());
        item.setLongitud(details.longitude());
        item.setTipoAcceso(details.accessType());
        item.setMontoEstimado(details.price());
        item.setDescripcionArancel(details.priceDescription());
        item.setSitioOficial(details.officialSite());
    }

    private Viaje findTrip(Long id) {
        return viajeRepository.findByIdAndEstadoNotIn(id,
                List.of(com.viajesazo.turismo_backend.model.EstadoViaje.CANCELADO))
                .orElseThrow(() -> new ResourceNotFoundException("No existe el viaje con id " + id));
    }

    private Circuito findCircuit(Long viajeId) {
        return circuitoRepository.findByViajeId(viajeId)
                .orElseThrow(() -> new ResourceNotFoundException("El viaje todavía no tiene un circuito generado"));
    }

    private void validateTrip(Viaje viaje) {
        List<String> missing = new ArrayList<>();
        if (viaje.getEstado() != EstadoViaje.PLANIFICADO && viaje.getEstado() != EstadoViaje.EN_CURSO
                && viaje.getEstado() != EstadoViaje.BORRADOR) {
            throw new BusinessRuleException("el estado actual del viaje no permite generar un circuito");
        }
        if (viaje.getFechaInicio() == null) missing.add("fecha de inicio");
        if (viaje.getFechaFin() == null) missing.add("fecha de fin");
        if (viaje.getZonaInteres() == null) {
            missing.add("zona de interés");
        } else if (viaje.getZonaInteres().getLatitud() == null || viaje.getZonaInteres().getLongitud() == null) {
            missing.add("coordenadas de la zona de interés");
        }
        if (viaje.getRangoInteresKm() == null || viaje.getRangoInteresKm() <= 0) missing.add("radio de interés");
        if (viaje.getRitmo() == null) missing.add("ritmo del viaje");
        if (viaje.getInteresesCategoria() == null || viaje.getInteresesCategoria().isEmpty()) {
            missing.add("preferencias de interés");
        }
        if (!missing.isEmpty()) {
            throw new CircuitoDataMissingException(missing);
        }
        if (viaje.getFechaFin().isBefore(effectiveStart(viaje))) {
            throw new BusinessRuleException("el viaje no tiene días disponibles para planificar");
        }
    }

    private void snapshot(Circuito circuito, Viaje viaje) {
        circuito.setFechaInicioSnapshot(viaje.getFechaInicio());
        circuito.setFechaFinSnapshot(viaje.getFechaFin());
        circuito.setRangoInteresKmSnapshot(viaje.getRangoInteresKm());
        circuito.setRitmoSnapshot(viaje.getRitmo());
        Ubicacion zona = viaje.getZonaInteres();
        circuito.setZonaCiudadSnapshot(zona == null ? null : zona.getCiudad());
        circuito.setZonaLocalidadSnapshot(zona == null ? null : zona.getLocalidad());
        circuito.setZonaDireccionSnapshot(zona == null ? null : zona.getDireccion());
        circuito.setZonaLatitudSnapshot(zona == null ? null : zona.getLatitud());
        circuito.setZonaLongitudSnapshot(zona == null ? null : zona.getLongitud());
        circuito.setInteresesCategoriaSnapshot(viaje.getInteresesCategoria() == null
                ? new ArrayList<>() : new ArrayList<>(viaje.getInteresesCategoria()));
    }

    private List<String> staleReasons(Circuito circuito) {
        Viaje viaje = circuito.getViaje();
        if (viaje == null || circuito.getFechaInicioSnapshot() == null) {
            return List.of();
        }
        List<String> motivos = new ArrayList<>();
        if (!Objects.equals(circuito.getFechaInicioSnapshot(), viaje.getFechaInicio())
                || !Objects.equals(circuito.getFechaFinSnapshot(), viaje.getFechaFin())) {
            motivos.add("FECHAS");
        }
        Set<InteresCategoria> snapshotInterests = new LinkedHashSet<>(circuito.getInteresesCategoriaSnapshot()
                == null ? List.of() : circuito.getInteresesCategoriaSnapshot());
        Set<InteresCategoria> currentInterests = new LinkedHashSet<>(viaje.getInteresesCategoria() == null
                ? List.of() : viaje.getInteresesCategoria());
        if (!snapshotInterests.equals(currentInterests)) {
            motivos.add("PREFERENCIAS");
        }
        Ubicacion zona = viaje.getZonaInteres();
        if (zona == null
                || !sameDecimal(circuito.getZonaLatitudSnapshot(), zona.getLatitud())
                || !sameDecimal(circuito.getZonaLongitudSnapshot(), zona.getLongitud())
                || !Objects.equals(circuito.getZonaCiudadSnapshot(), zona.getCiudad())
                || !Objects.equals(circuito.getZonaLocalidadSnapshot(), zona.getLocalidad())
                || !Objects.equals(circuito.getZonaDireccionSnapshot(), zona.getDireccion())) {
            motivos.add("ZONA");
        }
        if (!Objects.equals(circuito.getRitmoSnapshot(), viaje.getRitmo())) {
            motivos.add("RITMO");
        }
        return motivos;
    }

    private static boolean sameDecimal(BigDecimal left, BigDecimal right) {
        return left == null ? right == null : right != null && left.compareTo(right) == 0;
    }

    private LocalDate effectiveStart(Viaje viaje) {
        LocalDate today = LocalDate.now(clock);
        return viaje.getFechaInicio().isBefore(today) ? today : viaje.getFechaInicio();
    }

    private List<CircuitCandidate> candidates(Viaje viaje, LocalDate start) {
        List<CircuitCandidate> candidates = new ArrayList<>();
        for (PropuestaTuristica proposal : propuestaRepository.findAll()) {
            if (!isEligible(viaje, proposal)) {
                continue;
            }
            List<CircuitCandidate.TimeSlot> slots = proposal instanceof Evento event
                    ? eventSlots(event, start, viaje.getFechaFin())
                    : activitySlots((Actividad) proposal, start, viaje.getFechaFin());
            if (!slots.isEmpty()) {
                candidates.add(toCandidate(proposal, slots));
            }
        }
        return candidates;
    }

    private List<CircuitCandidate.TimeSlot> eventSlots(Evento event, LocalDate start, LocalDate end) {
        LocalTime from = event.getHorarioInicio() == null || event.getHorarioFin() == null
                ? EVENT_START : event.getHorarioInicio();
        LocalTime to = event.getHorarioInicio() == null || event.getHorarioFin() == null
                ? EVENT_END : event.getHorarioFin();
        List<CircuitCandidate.TimeSlot> slots = new ArrayList<>();
        LocalDate first = event.getFechaInicio().isAfter(start) ? event.getFechaInicio() : start;
        LocalDate last = event.getFechaFin().isBefore(end) ? event.getFechaFin() : end;
        for (LocalDate day = first; !day.isAfter(last); day = day.plusDays(1)) {
            slots.add(new CircuitCandidate.TimeSlot(day, from, to));
        }
        return slots;
    }

    private List<CircuitCandidate.TimeSlot> activitySlots(Actividad activity, LocalDate start, LocalDate end) {
        if (activity.getDisponibilidades() == null || activity.getDisponibilidades().isEmpty()) return List.of();
        List<CircuitCandidate.TimeSlot> slots = new ArrayList<>();
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            for (var availability : activity.getDisponibilidades()) {
                if (availability.getDiaSemana() != day.getDayOfWeek()) continue;
                LocalTime finish = availability.getHoraInicio().plusMinutes(activity.getDuracionMinutos());
                if (!finish.isAfter(availability.getHoraFin())) {
                    slots.add(new CircuitCandidate.TimeSlot(day, availability.getHoraInicio(), finish));
                }
            }
        }
        return slots;
    }

    private Integer durationMinutes(LocalTime start, LocalTime end) {
        if (start == null || end == null) {
            return null;
        }
        long minutes = Duration.between(start, end).toMinutes();
        return minutes > 0 ? (int) minutes : null;
    }

    private CircuitoAlternativa toEntity(GeneratedAlternative source) {
        CircuitoAlternativa result = new CircuitoAlternativa();
        result.setEstrategia(CircuitStrategy.valueOf(source.strategy().name()));
        result.setDistanciaTotalKm(source.totalDistanceKm());
        result.setAfinidadIntereses(source.interestAffinity());
        result.setCategoriasCubiertas(source.categoriesCovered().stream().filter(java.util.Objects::nonNull).toList());
        result.setAdvertencia(source.warning());
        for (ScheduledProposal proposal : source.proposals()) {
            CircuitoItem item = new CircuitoItem();
            item.setPropuestaId(proposal.proposalId());
            item.setPropuestaNombre(proposal.proposalName());
            item.setDescripcion(proposal.description());
            item.setCategoria(proposal.category());
            item.setTipo(proposal.type());
            item.setFecha(proposal.date());
            item.setOrden(proposal.order());
            item.setHoraInicio(proposal.start());
            item.setHoraFin(proposal.end());
            item.setTrasladoKm(proposal.transferDistanceKm());
            item.setTrasladoMinutos(proposal.transferMinutes());
            item.setDisponible(proposal.available());
            item.setMotivoNoDisponible(proposal.unavailableReason());
            CircuitCandidate.ProposalDetails details = proposal.details();
            applyDetails(item, details);
            item.setDuracionMinutos(details.durationMinutes() != null
                    ? details.durationMinutes()
                    : durationMinutes(proposal.start(), proposal.end()));
            result.addItem(item);
        }
        return result;
    }

    private String similarityWarning(List<GeneratedAlternative> alternatives) {
        if (alternatives.size() < 2) return null;
        Set<Long> first = alternatives.get(0).proposals().stream().map(ScheduledProposal::proposalId)
                .collect(java.util.stream.Collectors.toSet());
        boolean similar = alternatives.stream().skip(1)
                .allMatch(alternative -> alternative.proposals().stream().map(ScheduledProposal::proposalId)
                        .collect(java.util.stream.Collectors.toSet()).equals(first));
        return similar ? "Las alternativas resultaron muy similares con las propuestas disponibles" : null;
    }

    private void refreshAvailability(Circuito circuito) {
        Map<Long, PropuestaTuristica> proposals = propuestaRepository.findAll().stream()
                .collect(Collectors.toMap(PropuestaTuristica::getId, Function.identity()));
        LocalDateTime now = LocalDateTime.now(clock);
        for (CircuitoAlternativa alternative : circuito.getAlternativas()) {
            for (CircuitoItem item : alternative.getItems()) {
                String reason = unavailableReason(item, proposals.get(item.getPropuestaId()), now);
                item.setDisponible(reason == null);
                item.setMotivoNoDisponible(reason);
            }
        }
    }

    private String unavailableReason(CircuitoItem item, PropuestaTuristica proposal, LocalDateTime now) {
        if (proposal == null) {
            return "la propuesta ya no está disponible";
        }
        NombreEstado state = proposal.getNombreEstado();
        if (state == NombreEstado.CANCELADO) {
            return "la propuesta está cancelada";
        }
        if (state == NombreEstado.FINALIZADO) {
            return "la propuesta está finalizada";
        }
        if (LocalDateTime.of(item.getFecha(), item.getHoraFin()).isBefore(now)) {
            return "la fecha de la propuesta ya pasó";
        }
        if (proposal instanceof Evento event) {
            return eventChanged(event, item) ? "la propuesta cambió de fecha u horario" : null;
        }
        if (proposal instanceof Actividad activity) {
            return activityUnavailable(activity, item) ? "la disponibilidad de la actividad cambió" : null;
        }
        return null;
    }

    private boolean eventChanged(Evento event, CircuitoItem item) {
        if (event.getFechaInicio() == null || event.getFechaFin() == null) {
            return false;
        }
        if (item.getFecha().isBefore(event.getFechaInicio()) || item.getFecha().isAfter(event.getFechaFin())) {
            return true;
        }
        LocalTime start = event.getHorarioInicio() == null || event.getHorarioFin() == null
                ? EVENT_START : event.getHorarioInicio();
        LocalTime end = event.getHorarioInicio() == null || event.getHorarioFin() == null
                ? EVENT_END : event.getHorarioFin();
        return !start.equals(item.getHoraInicio()) || !end.equals(item.getHoraFin());
    }

    private boolean activityUnavailable(Actividad activity, CircuitoItem item) {
        if (activity.getDisponibilidades() == null || item.getHoraInicio() == null || item.getHoraFin() == null) {
            return true;
        }
        for (var availability : activity.getDisponibilidades()) {
            if (availability.getDiaSemana() != item.getFecha().getDayOfWeek()) {
                continue;
            }
            if (!item.getHoraInicio().isBefore(availability.getHoraInicio())
                    && !item.getHoraFin().isAfter(availability.getHoraFin())) {
                return false;
            }
        }
        return true;
    }

    private GeneracionCircuitoResponse toGenerationResponse(Circuito circuito) {
        List<CircuitoAlternativaResponse> alternatives = circuito.getAlternativas().stream()
                .sorted(Comparator.comparing(CircuitoAlternativa::getEstrategia))
                .map(this::toResponse)
                .toList();
        return new GeneracionCircuitoResponse(circuito.getGeneradoEn(), circuito.getEstrategiaSeleccionada(),
                alternatives, circuito.isDistanciasEstimadas(), circuito.getAdvertencia());
    }

    private CircuitoAlternativaResponse toResponse(CircuitoAlternativa alternative) {
        List<CircuitoItemResponse> items = alternative.getItems().stream()
                .map(item -> new CircuitoItemResponse(item.getId(), item.getPropuestaId(), item.getPropuestaNombre(),
                        item.getDescripcion(), item.getCategoria(), item.getTipo(), item.getFecha(), item.getOrden(),
                        item.getHoraInicio(), item.getHoraFin(), item.getTrasladoKm(), item.getTrasladoMinutos(),
                        item.isDisponible(), item.getMotivoNoDisponible(),
                        item.getImagenes() == null ? List.of() : List.copyOf(item.getImagenes()),
                        item.getCiudad(), item.getLocalidad(), item.getDireccion(), item.getLugarRecinto(),
                        item.getLatitud(), item.getLongitud(), item.getTipoAcceso(), item.getMontoEstimado(),
                        item.getDescripcionArancel(), item.getSitioOficial(), item.getDuracionMinutos()))
                .toList();
        return new CircuitoAlternativaResponse(alternative.getEstrategia(), items, alternative.getDistanciaTotalKm(),
                alternative.getAfinidadIntereses(), new LinkedHashSet<>(alternative.getCategoriasCubiertas()),
                alternative.getAdvertencia());
    }
}
