package com.viajesazo.turismo_backend.service;

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
import com.viajesazo.turismo_backend.dto.request.SeleccionCircuitoRequest;
import com.viajesazo.turismo_backend.dto.response.CircuitoAlternativaResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoItemResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoResponse;
import com.viajesazo.turismo_backend.dto.response.GeneracionCircuitoResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
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

    @Transactional
    public GeneracionCircuitoResponse generate(Long viajeId) {
        Viaje viaje = findTrip(viajeId);
        validateTrip(viaje);
        if (circuitoRepository.findByViajeId(viajeId).isPresent()) {
            throw new BusinessRuleException("el circuito del viaje ya fue generado; no se permite regenerarlo");
        }

        LocalDate start = effectiveStart(viaje);
        List<CircuitCandidate> candidates = candidates(viaje, start);
        Set<InteresCategoria> interests = viaje.getInteresesCategoria() == null
                ? Set.of() : new LinkedHashSet<>(viaje.getInteresesCategoria());
        List<GeneratedAlternative> generated = generator.generate(start, viaje.getFechaFin(),
                viaje.getRitmo(), interests, candidates);

        Circuito circuito = new Circuito();
        circuito.setViaje(viaje);
        circuito.setGeneradoEn(LocalDateTime.now(clock));
        circuito.setDistanciasEstimadas(distanceProvider.estimated());
        circuito.setAdvertencia(similarityWarning(generated));
        for (GeneratedAlternative alternative : generated) {
            circuito.addAlternativa(toEntity(alternative));
        }
        try {
            circuitoRepository.saveAndFlush(circuito);
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessRuleException("el circuito del viaje ya fue generado");
        }
        return toGenerationResponse(circuito);
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
    public com.viajesazo.turismo_backend.dto.response.CircuitoResponse selected(Long viajeId) {
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
        return new com.viajesazo.turismo_backend.dto.response.CircuitoResponse(
                circuito.getGeneradoEn(), circuito.getEstrategiaSeleccionada(), toResponse(alternative),
                circuito.isDistanciasEstimadas(), circuito.getAdvertencia());
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
        if (!missing.isEmpty()) {
            throw new BusinessRuleException("faltan datos para generar el circuito: " + String.join(", ", missing));
        }
        if (viaje.getFechaFin().isBefore(effectiveStart(viaje))) {
            throw new BusinessRuleException("el viaje no tiene días disponibles para planificar");
        }
    }

    private LocalDate effectiveStart(Viaje viaje) {
        LocalDate today = LocalDate.now(clock);
        return viaje.getFechaInicio().isBefore(today) ? today : viaje.getFechaInicio();
    }

    private List<CircuitCandidate> candidates(Viaje viaje, LocalDate start) {
        List<CircuitCandidate> candidates = new ArrayList<>();
        for (PropuestaTuristica proposal : propuestaRepository.findAll()) {
            NombreEstado state = proposal.getNombreEstado();
            if (state == null || INACTIVE_STATES.contains(state) || proposal.getUbicacion() == null
                    || proposal.getUbicacion().getLatitud() == null || proposal.getUbicacion().getLongitud() == null) {
                continue;
            }
            Ubicacion location = proposal.getUbicacion();
            double distance = distanceProvider.estimate(
                    viaje.getZonaInteres().getLatitud().doubleValue(),
                    viaje.getZonaInteres().getLongitud().doubleValue(),
                    location.getLatitud().doubleValue(), location.getLongitud().doubleValue()).distanceKm();
            if (distance > viaje.getRangoInteresKm()) {
                continue;
            }
            List<CircuitCandidate.TimeSlot> slots = proposal instanceof Evento event
                    ? eventSlots(event, start, viaje.getFechaFin())
                    : activitySlots((Actividad) proposal, start, viaje.getFechaFin());
            if (!slots.isEmpty()) {
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
                candidates.add(new CircuitCandidate(proposal.getId(), proposal.getNombre(), proposal.getDescripcion(),
                        proposal.getTipo(), proposal.getCategoria(), location.getLatitud().doubleValue(),
                        location.getLongitud().doubleValue(), slots, details));
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
                .map(item -> new CircuitoItemResponse(item.getPropuestaId(), item.getPropuestaNombre(),
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
