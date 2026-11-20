package com.viajesazo.turismo_backend.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
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
import com.viajesazo.turismo_backend.circuit.DayQuota;
import com.viajesazo.turismo_backend.circuit.GeneratedAlternative;
import com.viajesazo.turismo_backend.circuit.DistanceProvider;
import com.viajesazo.turismo_backend.circuit.ScheduledProposal;
import com.viajesazo.turismo_backend.circuit.TravelEstimate;
import com.viajesazo.turismo_backend.dto.request.AgregarParadaSugeridaRequest;
import com.viajesazo.turismo_backend.dto.request.DescartarAvisoDiaRequest;
import com.viajesazo.turismo_backend.dto.request.ReemplazoItemCircuitoRequest;
import com.viajesazo.turismo_backend.dto.request.SeleccionCircuitoRequest;
import com.viajesazo.turismo_backend.dto.response.AlternativaItemResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoAlternativaResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoItemResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoSeleccionadoResponse;
import com.viajesazo.turismo_backend.dto.response.DiaCircuitoResponse;
import com.viajesazo.turismo_backend.dto.response.GeneracionCircuitoResponse;
import com.viajesazo.turismo_backend.dto.response.OpcionSustitucionResponse;
import com.viajesazo.turismo_backend.dto.response.OpcionesSustitucionResponse;
import com.viajesazo.turismo_backend.dto.response.ParadaVecinaResponse;
import com.viajesazo.turismo_backend.dto.response.PropuestaFueraDeHuecoResponse;
import com.viajesazo.turismo_backend.dto.response.ResumenDiaAlternativaResponse;
import com.viajesazo.turismo_backend.dto.response.ResumenDiaCircuito;
import com.viajesazo.turismo_backend.dto.response.SugerenciaDiaResponse;
import com.viajesazo.turismo_backend.dto.response.SugerenciasDiaResponse;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.exception.CircuitoDataMissingException;
import com.viajesazo.turismo_backend.exception.ConfirmationRequiredException;
import com.viajesazo.turismo_backend.exception.InvariantViolationException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.CircuitStrategy;
import com.viajesazo.turismo_backend.model.Circuito;
import com.viajesazo.turismo_backend.model.CircuitoAlternativa;
import com.viajesazo.turismo_backend.model.CircuitoDiaEstado;
import com.viajesazo.turismo_backend.model.CircuitoItem;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.MotivoSugerencia;
import com.viajesazo.turismo_backend.model.NombreEstado;
import com.viajesazo.turismo_backend.model.OrigenCircuitoItem;
import com.viajesazo.turismo_backend.model.PropuestaTuristica;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.model.ViajeDiaPlan;
import com.viajesazo.turismo_backend.repository.CircuitoRepository;
import com.viajesazo.turismo_backend.repository.MeGustaRepository;
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
    private final MeGustaRepository meGustaRepository;
    private final CircuitGenerator generator;
    private final DistanceProvider distanceProvider;
    private final Clock clock;

    public record GenerationResult(GeneracionCircuitoResponse response, boolean replaced) {
    }

    /** Una propuesta que entra en el hueco de la parada a sustituir, con lo que explica su orden. */
    private record SubstitutionOption(CircuitCandidate candidate, LocalTime start, LocalTime end,
            boolean liked, boolean inInterests, double distanceKm, int travelMinutes) {
    }

    /** Hueco libre de una parada: lo limitan la parada anterior y la siguiente del mismo día. */
    private record SubstitutionWindow(CircuitoItem previous, CircuitoItem next, LocalTime start, LocalTime end) {
    }

    private record SubstitutionAnalysis(SubstitutionWindow window, List<SubstitutionOption> options,
            List<PropuestaFueraDeHuecoResponse> notFitting, Map<Long, Long> likeCounts) {
    }

    /** Mismos límites del día que usa la generación del circuito. */
    private static final LocalTime DAY_START = LocalTime.of(6, 0);
    private static final LocalTime DAY_END = LocalTime.of(23, 59);
    /** Las opciones se agrupan por cercanía en tramos de 500 m; dentro del tramo decide la popularidad. */
    private static final double SUBSTITUTION_DISTANCE_STEP_KM = 0.5;
    private static final int MAX_NO_ENTRAN = 6;

    private record SuggestionOption(
            CircuitCandidate candidate,
            LocalTime start,
            LocalTime end,
            MotivoSugerencia motivo,
            double transferKm,
            int transferMinutes) {
    }

    private static final int MAX_SUGERENCIAS_POR_MOTIVO = 10;

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
        Map<LocalDate, DayQuota> dayQuotas = dayQuotas(viaje);
        Set<Long> likedIds = meGustaRepository.findPropuestaIdsByUsuarioId(viaje.getUsuario().getId());
        Map<Long, Long> likeCounts = likeCounts(candidates.stream().map(CircuitCandidate::id).toList());
        List<GeneratedAlternative> generated = generator.generate(start, viaje.getFechaFin(),
                viaje.getRitmo(), interests, candidates, dayQuotas, likedIds, likeCounts);
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
            circuito.getDiasEstado().clear();
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
        if (circuito.getEstrategiaSeleccionada() != null) {
            rebuildDayStates(circuito, viaje);
        }
        try {
            circuitoRepository.saveAndFlush(circuito);
        } catch (DataIntegrityViolationException ex) {
            throw new ConfirmationRequiredException(
                    "el circuito del viaje ya fue generado; confirmá con reemplazar=true para regenerarlo");
        }
        return new GenerationResult(toGenerationResponse(circuito), existing != null);
    }

    /**
     * Confirma una alternativa del circuito.
     * <p>
     * Efecto de negocio (inscripción automática): al setear {@code estrategiaSeleccionada},
     * el turista queda contado como inscripto en cada evento/actividad ({@code CircuitoItem.propuestaId})
     * de esa alternativa, siempre que la propuesta tenga publicador. El conteo es
     * {@code COUNT(DISTINCT usuario)} por propuesta (no hay doble inscripción del mismo turista).
     * El dashboard del publicador lee esos conteos vía {@code InscriptosService}.
     */
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
        rebuildDayStates(circuito, circuito.getViaje());
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

    /**
     * Opciones para sustituir una parada del circuito confirmado: todo lo que el turista puede hacer
     * en el hueco libre de ese día (ver {@link #analyzeSubstitution}).
     */
    @Transactional(readOnly = true)
    public OpcionesSustitucionResponse replacementAlternatives(Long viajeId, Long itemId) {
        Viaje viaje = findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = selectedAlternative(circuito);
        CircuitoItem target = selectedItem(alternative, itemId);
        return toSubstitutionResponse(target, analyzeSubstitution(viaje, alternative, target));
    }

    @Transactional
    public CircuitoSeleccionadoResponse replaceSelectedItem(Long viajeId, Long itemId,
            ReemplazoItemCircuitoRequest request) {
        Viaje viaje = findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = selectedAlternative(circuito);
        CircuitoItem target = selectedItem(alternative, itemId);
        SubstitutionOption option = chosenSubstitution(viaje, alternative, target, request);

        applyCandidate(target, option.candidate(), option.start(), option.end());
        target.setOrigen(OrigenCircuitoItem.REEMPLAZO);
        renumberDay(alternative, target.getFecha());
        recalculateTransfersAround(alternative, target);
        recalculateMetrics(circuito, alternative);
        circuitoRepository.save(circuito);
        return selectedResponse(circuito, viajeId);
    }

    /*
     * Ajustes antes de confirmar: mientras el turista todavía no eligió ninguna alternativa, puede
     * sustituir o eliminar paradas de cualquiera de las alternativas generadas. Las reglas son las
     * mismas que para el circuito confirmado (hueco del día, traslados y radio).
     */

    @Transactional(readOnly = true)
    public OpcionesSustitucionResponse alternativeReplacementOptions(Long viajeId, CircuitStrategy estrategia,
            Long itemId) {
        Viaje viaje = findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = editableAlternative(circuito, estrategia);
        CircuitoItem target = alternativeItem(alternative, itemId);
        return toSubstitutionResponse(target, analyzeSubstitution(viaje, alternative, target));
    }

    @Transactional
    public GeneracionCircuitoResponse replaceAlternativeItem(Long viajeId, CircuitStrategy estrategia, Long itemId,
            ReemplazoItemCircuitoRequest request) {
        Viaje viaje = findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = editableAlternative(circuito, estrategia);
        CircuitoItem target = alternativeItem(alternative, itemId);
        SubstitutionOption option = chosenSubstitution(viaje, alternative, target, request);

        applyCandidate(target, option.candidate(), option.start(), option.end());
        target.setOrigen(OrigenCircuitoItem.REEMPLAZO);
        renumberDay(alternative, target.getFecha());
        recalculateTransfersAround(alternative, target);
        recalculateMetrics(circuito, alternative);
        circuitoRepository.save(circuito);
        return toGenerationResponse(circuito);
    }

    @Transactional
    public GeneracionCircuitoResponse deleteAlternativeItem(Long viajeId, CircuitStrategy estrategia, Long itemId,
            boolean confirmar) {
        findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = editableAlternative(circuito, estrategia);
        CircuitoItem item = alternativeItem(alternative, itemId);
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
        return toGenerationResponse(circuito);
    }

    @Transactional(readOnly = true)
    public SugerenciasDiaResponse daySuggestions(Long viajeId, LocalDate fecha) {
        Viaje viaje = findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = selectedAlternative(circuito);
        requireDateInRange(circuito, alternative, fecha);
        ensureDayStates(circuito, viaje);
        List<SugerenciaDiaResponse> sugerencias = suggestionOptions(viaje, circuito, alternative, fecha,
                selectedDayIncomplete(circuito, fecha)).stream()
                .map(this::toSuggestionResponse)
                .toList();
        return new SugerenciasDiaResponse(sugerencias, sugerencias.isEmpty()
                ? "No encontramos propuestas para completar este día"
                : null);
    }

    @Transactional
    public CircuitoSeleccionadoResponse addSuggestedItem(Long viajeId, LocalDate fecha,
            AgregarParadaSugeridaRequest request) {
        Viaje viaje = findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = selectedAlternative(circuito);
        requireDateInRange(circuito, alternative, fecha);
        ensureDayStates(circuito, viaje);
        SuggestionOption option = chosenSuggestion(suggestionOptions(viaje, circuito, alternative, fecha,
                selectedDayIncomplete(circuito, fecha)), request);
        insertSuggestion(circuito, alternative, fecha, option);
        dayState(circuito, fecha).setAgregadasPorUsuario(
                dayState(circuito, fecha).getAgregadasPorUsuario() + 1);
        circuitoRepository.save(circuito);
        return selectedResponse(circuito, viajeId);
    }

    @Transactional
    public CircuitoSeleccionadoResponse discardDayNotice(Long viajeId, LocalDate fecha,
            DescartarAvisoDiaRequest request) {
        Viaje viaje = findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = selectedAlternative(circuito);
        requireDateInRange(circuito, alternative, fecha);
        ensureDayStates(circuito, viaje);
        if (Boolean.TRUE.equals(request.descartado())) {
            dayState(circuito, fecha).setAvisoDescartado(true);
        }
        circuitoRepository.save(circuito);
        return selectedResponse(circuito, viajeId);
    }

    /*
     * Completar días antes de confirmar: mientras no se eligió ninguna alternativa, cada una muestra
     * qué días quedaron con menos paradas de las pedidas y deja sumar sugerencias. El conteo es en
     * vivo sobre las paradas de la alternativa (si el turista elimina una, el día vuelve a quedar
     * incompleto); no hay "Dejarlo así" guardado porque todavía no hay nada confirmado.
     */

    @Transactional(readOnly = true)
    public List<ResumenDiaAlternativaResponse> alternativeDaySummaries(Long viajeId, CircuitStrategy estrategia) {
        Viaje viaje = findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = editableAlternative(circuito, estrategia);
        LocalDate start = selectedStart(circuito, alternative);
        LocalDate end = selectedEnd(circuito, alternative);
        List<ResumenDiaAlternativaResponse> days = new ArrayList<>();
        if (start == null || end == null) {
            return days;
        }
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            days.add(new ResumenDiaAlternativaResponse(date, liveSummary(circuito, viaje, alternative, date)));
        }
        return days;
    }

    @Transactional(readOnly = true)
    public SugerenciasDiaResponse alternativeDaySuggestions(Long viajeId, CircuitStrategy estrategia,
            LocalDate fecha) {
        Viaje viaje = findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = editableAlternative(circuito, estrategia);
        requireDateInRange(circuito, alternative, fecha);
        List<SugerenciaDiaResponse> sugerencias = suggestionOptions(viaje, circuito, alternative, fecha,
                liveSummary(circuito, viaje, alternative, fecha).pendiente()).stream()
                .map(this::toSuggestionResponse)
                .toList();
        return new SugerenciasDiaResponse(sugerencias, sugerencias.isEmpty()
                ? "No encontramos propuestas para completar este día"
                : null);
    }

    @Transactional
    public GeneracionCircuitoResponse addAlternativeSuggestedItem(Long viajeId, CircuitStrategy estrategia,
            LocalDate fecha, AgregarParadaSugeridaRequest request) {
        Viaje viaje = findTrip(viajeId);
        Circuito circuito = findCircuit(viajeId);
        CircuitoAlternativa alternative = editableAlternative(circuito, estrategia);
        requireDateInRange(circuito, alternative, fecha);
        SuggestionOption option = chosenSuggestion(suggestionOptions(viaje, circuito, alternative, fecha,
                liveSummary(circuito, viaje, alternative, fecha).pendiente()), request);
        insertSuggestion(circuito, alternative, fecha, option);
        circuitoRepository.save(circuito);
        return toGenerationResponse(circuito);
    }

    private SuggestionOption chosenSuggestion(List<SuggestionOption> options, AgregarParadaSugeridaRequest request) {
        return options.stream()
                .filter(candidate -> request.propuestaId().equals(candidate.candidate().id()))
                .findFirst()
                .orElseThrow(() -> new InvariantViolationException(
                        "la propuesta elegida ya no es una sugerencia válida para este día"));
    }

    private void insertSuggestion(Circuito circuito, CircuitoAlternativa alternative, LocalDate fecha,
            SuggestionOption option) {
        CircuitoItem item = new CircuitoItem();
        item.setFecha(fecha);
        item.setOrigen(OrigenCircuitoItem.SUGERENCIA_ACEPTADA);
        applyCandidate(item, option.candidate(), option.start(), option.end());
        item.setTrasladoKm(option.transferKm());
        item.setTrasladoMinutos(option.transferMinutes());
        alternative.addItem(item);
        renumberDay(alternative, fecha);
        recalculateTransfersAround(alternative, item);
        recalculateMetrics(circuito, alternative);
    }

    /** Resumen de un día de una alternativa sin confirmar, contado sobre sus paradas actuales. */
    private ResumenDiaCircuito liveSummary(Circuito circuito, Viaje viaje, CircuitoAlternativa alternative,
            LocalDate fecha) {
        TipoRitmo ritmo = circuito.getRitmoSnapshot() != null ? circuito.getRitmoSnapshot() : viaje.getRitmo();
        int minimo = dayMinimum(ritmo, dayQuotas(viaje).get(fecha));
        List<CircuitoItem> items = sortedDayItems(alternative, fecha);
        int agregadas = (int) items.stream()
                .filter(item -> item.getOrigen() == OrigenCircuitoItem.SUGERENCIA_ACEPTADA)
                .count();
        int asignadas = items.size() - agregadas;
        boolean pendiente = minimo > 0
                && items.size() < minimo
                && !fecha.isBefore(LocalDate.now(clock));
        String mensaje = pendiente ? incompleteDayMessage(items.size(), minimo) : null;
        return new ResumenDiaCircuito(asignadas, minimo, agregadas, false, mensaje, pendiente, pendiente);
    }

    private static String incompleteDayMessage(int asignadas, int minimo) {
        return "Se asignaron " + asignadas + " de " + minimo
                + " paradas pedidas para este día. La generación no rellena sola: podés completar con sugerencias.";
    }

    /** Para el circuito confirmado: el día sigue incompleto según la foto guardada y lo que sumó el turista. */
    private boolean selectedDayIncomplete(Circuito circuito, LocalDate fecha) {
        CircuitoDiaEstado estado = dayState(circuito, fecha);
        return estado.getMinimo() > 0
                && (estado.getAsignadas() + estado.getAgregadasPorUsuario()) < estado.getMinimo();
    }

    private CircuitoItem selectedItem(CircuitoAlternativa alternative, Long itemId) {
        return alternative.getItems().stream()
                .filter(candidate -> itemId.equals(candidate.getId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe la parada con id " + itemId + " en el circuito seleccionado"));
    }

    /** Alternativa que todavía se puede ajustar: solo mientras no haya ninguna elegida. */
    private CircuitoAlternativa editableAlternative(Circuito circuito, CircuitStrategy estrategia) {
        if (circuito.getEstrategiaSeleccionada() != null) {
            throw new BusinessRuleException(
                    "el circuito ya tiene una alternativa elegida; sus paradas se modifican desde el circuito confirmado");
        }
        return circuito.getAlternativas().stream()
                .filter(item -> item.getEstrategia() == estrategia)
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe la alternativa " + estrategia + " en el circuito generado"));
    }

    private CircuitoItem alternativeItem(CircuitoAlternativa alternative, Long itemId) {
        return alternative.getItems().stream()
                .filter(candidate -> itemId.equals(candidate.getId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe la parada con id " + itemId + " en la alternativa " + alternative.getEstrategia()));
    }

    private CircuitoSeleccionadoResponse selectedResponse(Circuito circuito, Long viajeId) {
        CircuitoAlternativa alternative = selectedAlternative(circuito);
        if (circuito.getViaje() != null) {
            ensureDayStates(circuito, circuito.getViaje());
        }
        LocalDate start = selectedStart(circuito, alternative);
        LocalDate end = selectedEnd(circuito, alternative);
        List<String> motivos = staleReasons(circuito);
        return new CircuitoSeleccionadoResponse(
                circuito.getId(), viajeId, circuito.getGeneradoEn(), circuito.getEstrategiaSeleccionada(),
                !motivos.isEmpty(), motivos, circuito.isDistanciasEstimadas(), circuito.getAdvertencia(),
                selectedDays(circuito, alternative, start, end));
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

    private List<DiaCircuitoResponse> selectedDays(Circuito circuito, CircuitoAlternativa alternative,
            LocalDate start, LocalDate end) {
        Map<LocalDate, List<CircuitoItem>> byDate = alternative.getItems().stream()
                .filter(item -> item.getFecha() != null)
                .collect(Collectors.groupingBy(CircuitoItem::getFecha));
        List<DiaCircuitoResponse> days = new ArrayList<>();
        if (start == null || end == null || end.isBefore(start)) {
            byDate.keySet().stream().sorted()
                    .forEach(date -> days.add(selectedDay(circuito, date, byDate.get(date))));
            return days;
        }
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            days.add(selectedDay(circuito, date, byDate.get(date)));
        }
        return days;
    }

    private DiaCircuitoResponse selectedDay(Circuito circuito, LocalDate date, List<CircuitoItem> items) {
        List<AlternativaItemResponse> responses = items == null ? List.of()
                : items.stream()
                        .sorted(itemOrder())
                        .map(item -> new AlternativaItemResponse(item.getId(), item.getPropuestaId(),
                                item.getPropuestaNombre(), item.getTipo(), item.getCategoria(), item.getCiudad(),
                                item.getLocalidad(), item.getDireccion(), item.getHoraInicio(), item.getHoraFin(),
                                item.getDuracionMinutos() != null
                                        ? item.getDuracionMinutos()
                                        : durationMinutes(item.getHoraInicio(), item.getHoraFin()),
                                item.getOrigen() == null ? OrigenCircuitoItem.GENERADO : item.getOrigen()))
                        .toList();
        return new DiaCircuitoResponse(date, responses, buildResumen(circuito, date));
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

    /*
     * Sustituir una parada. El hueco va desde que termina la parada anterior hasta que empieza la
     * siguiente (sin vecinas: de 06:00 a 23:59, como la generación). Entra toda propuesta activa,
     * dentro del radio del viaje, que ese día tenga un horario donde se llegue a tiempo desde la
     * anterior, se llegue a tiempo a la siguiente y no se pise con otra parada. Las de categorías
     * fuera de los intereses también entran, marcadas con enIntereses=false.
     *
     * Orden: 1) lo que el turista marcó con Me gusta, 2) sus intereses, 3) cercanía a la parada de
     * referencia (en tramos de 500 m), 4) popularidad (Me gusta de todos), y por último el nombre.
     * Las que le gustaron o son de sus intereses pero no entran vuelven en noEntran con el motivo.
     */
    private SubstitutionAnalysis analyzeSubstitution(Viaje viaje, CircuitoAlternativa alternative,
            CircuitoItem target) {
        SubstitutionWindow window = substitutionWindow(alternative, target);
        if (target.getFecha() == null) {
            return new SubstitutionAnalysis(window, List.of(), List.of(), Map.of());
        }
        Set<Long> used = alternative.getItems().stream()
                .map(CircuitoItem::getPropuestaId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<InteresCategoria> interests = new LinkedHashSet<>(
                viaje.getInteresesCategoria() == null ? List.of() : viaje.getInteresesCategoria());
        Set<Long> likedIds = viaje.getUsuario() == null ? null
                : meGustaRepository.findPropuestaIdsByUsuarioId(viaje.getUsuario().getId());
        Set<Long> liked = likedIds == null ? Set.of() : likedIds;

        List<SubstitutionOption> options = new ArrayList<>();
        List<PropuestaFueraDeHuecoResponse> notFitting = new ArrayList<>();
        for (PropuestaTuristica proposal : propuestaRepository.findAll()) {
            if (proposal.getId() == null || used.contains(proposal.getId())) {
                continue;
            }
            NombreEstado state = proposal.getNombreEstado();
            if (state == null || INACTIVE_STATES.contains(state)) {
                continue;
            }
            Double zoneKm = distanceToZoneKm(viaje, proposal);
            if (zoneKm == null) {
                continue;
            }
            boolean isLiked = liked.contains(proposal.getId());
            boolean inInterests = proposal.getCategoria() != null && interests.contains(proposal.getCategoria());

            String reason = null;
            if (zoneKm > viaje.getRangoInteresKm()) {
                reason = "Queda a " + kilometers(zoneKm) + " km de tu zona y tu radio es de "
                        + kilometers(viaje.getRangoInteresKm()) + " km";
            } else {
                List<CircuitCandidate.TimeSlot> slots = proposalSlots(proposal, target.getFecha());
                if (slots.isEmpty()) {
                    reason = proposal instanceof Evento ? "No se realiza ese día" : "No abre ese día";
                } else {
                    CircuitCandidate.TimeSlot fitting = slots.stream()
                            .filter(slot -> fitsSubstitutionWindow(alternative, target, window, proposal, slot))
                            .findFirst()
                            .orElse(null);
                    if (fitting == null) {
                        CircuitCandidate.TimeSlot first = slots.get(0);
                        reason = "Su horario (" + clock(first.start()) + " – " + clock(first.end())
                                + ") no entra entre " + clock(window.start()) + " y " + clock(window.end())
                                + " contando los traslados";
                    } else {
                        TravelEstimate fromReference = travelFromReference(window, target, proposal);
                        options.add(new SubstitutionOption(toCandidate(proposal, List.of(fitting)),
                                fitting.start(), fitting.end(), isLiked, inInterests,
                                fromReference.distanceKm(), fromReference.durationMinutes()));
                    }
                }
            }
            if (reason != null && (isLiked || inInterests)) {
                notFitting.add(new PropuestaFueraDeHuecoResponse(proposal.getId(), proposal.getNombre(),
                        proposal.getTipo(), isLiked, reason));
            }
        }

        Map<Long, Long> likeCounts = likeCounts(options.stream().map(option -> option.candidate().id()).toList());
        options.sort(substitutionOrder(likeCounts));
        notFitting.sort(Comparator
                .comparing((PropuestaFueraDeHuecoResponse item) -> !item.meGusta())
                .thenComparing(PropuestaFueraDeHuecoResponse::propuestaNombre,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));
        return new SubstitutionAnalysis(window, options,
                notFitting.stream().limit(MAX_NO_ENTRAN).toList(), likeCounts);
    }

    private SubstitutionOption chosenSubstitution(Viaje viaje, CircuitoAlternativa alternative,
            CircuitoItem target, ReemplazoItemCircuitoRequest request) {
        return analyzeSubstitution(viaje, alternative, target).options().stream()
                .filter(option -> request.propuestaId().equals(option.candidate().id()))
                .findFirst()
                .orElseThrow(() -> new InvariantViolationException(
                        "la propuesta elegida no es un reemplazo válido para esta parada"));
    }

    private SubstitutionWindow substitutionWindow(CircuitoAlternativa alternative, CircuitoItem target) {
        if (target.getFecha() == null) {
            return new SubstitutionWindow(null, null, DAY_START, DAY_END);
        }
        List<CircuitoItem> ordered = sortedDayItems(alternative, target.getFecha());
        int index = ordered.indexOf(target);
        CircuitoItem previous = index > 0 ? ordered.get(index - 1) : null;
        CircuitoItem next = index >= 0 && index + 1 < ordered.size() ? ordered.get(index + 1) : null;
        LocalTime start = previous != null && previous.getHoraFin() != null ? previous.getHoraFin() : DAY_START;
        LocalTime end = next != null && next.getHoraInicio() != null ? next.getHoraInicio() : DAY_END;
        return new SubstitutionWindow(previous, next, start, end);
    }

    private boolean fitsSubstitutionWindow(CircuitoAlternativa alternative, CircuitoItem target,
            SubstitutionWindow window, PropuestaTuristica proposal, CircuitCandidate.TimeSlot slot) {
        int start = minuteOfDay(slot.start());
        int end = minuteOfDay(slot.end());
        if (end <= start) {
            // Termina después de medianoche (por ejemplo, 22:00 – 00:00).
            end += 24 * 60;
        }
        CircuitoItem previous = window.previous();
        if (previous != null && previous.getHoraFin() != null) {
            if (start < minuteOfDay(previous.getHoraFin()) + travelMinutes(previous, proposal, true)) {
                return false;
            }
        } else if (start < minuteOfDay(DAY_START)) {
            return false;
        }
        CircuitoItem next = window.next();
        if (next != null && next.getHoraInicio() != null
                && end + travelMinutes(next, proposal, false) > minuteOfDay(next.getHoraInicio())) {
            return false;
        }
        return !overlapsAnotherItem(alternative, target, slot.start(), slot.end());
    }

    /** Minutos de traslado entre una parada del día y la propuesta (ida o vuelta). */
    private int travelMinutes(CircuitoItem item, PropuestaTuristica proposal, boolean fromItem) {
        Ubicacion location = proposal.getUbicacion();
        if (!hasCoordinates(item) || location == null || location.getLatitud() == null
                || location.getLongitud() == null) {
            return 0;
        }
        TravelEstimate estimate = fromItem
                ? distanceProvider.estimate(item.getLatitud().doubleValue(), item.getLongitud().doubleValue(),
                        location.getLatitud().doubleValue(), location.getLongitud().doubleValue())
                : distanceProvider.estimate(location.getLatitud().doubleValue(), location.getLongitud().doubleValue(),
                        item.getLatitud().doubleValue(), item.getLongitud().doubleValue());
        return estimate.durationMinutes();
    }

    /**
     * Distancia que se le muestra al turista: desde la parada anterior; si es la primera del día,
     * desde la siguiente; si es la única, desde la parada que se reemplaza.
     */
    private TravelEstimate travelFromReference(SubstitutionWindow window, CircuitoItem target,
            PropuestaTuristica proposal) {
        CircuitoItem reference = window.previous() != null && hasCoordinates(window.previous()) ? window.previous()
                : window.next() != null && hasCoordinates(window.next()) ? window.next()
                : hasCoordinates(target) ? target : null;
        Ubicacion location = proposal.getUbicacion();
        if (reference == null || location == null || location.getLatitud() == null || location.getLongitud() == null) {
            return new TravelEstimate(0, 0);
        }
        return distanceProvider.estimate(reference.getLatitud().doubleValue(), reference.getLongitud().doubleValue(),
                location.getLatitud().doubleValue(), location.getLongitud().doubleValue());
    }

    private Double distanceToZoneKm(Viaje viaje, PropuestaTuristica proposal) {
        Ubicacion zone = viaje.getZonaInteres();
        Ubicacion location = proposal.getUbicacion();
        if (zone == null || zone.getLatitud() == null || zone.getLongitud() == null
                || viaje.getRangoInteresKm() == null || location == null
                || location.getLatitud() == null || location.getLongitud() == null) {
            return null;
        }
        return distanceProvider.estimate(zone.getLatitud().doubleValue(), zone.getLongitud().doubleValue(),
                location.getLatitud().doubleValue(), location.getLongitud().doubleValue()).distanceKm();
    }

    private Comparator<SubstitutionOption> substitutionOrder(Map<Long, Long> likeCounts) {
        return Comparator
                .comparing((SubstitutionOption option) -> !option.liked())
                .thenComparing((SubstitutionOption option) -> !option.inInterests())
                .thenComparingDouble((SubstitutionOption option) ->
                        Math.floor(option.distanceKm() / SUBSTITUTION_DISTANCE_STEP_KM))
                .thenComparingLong((SubstitutionOption option) ->
                        -likeCounts.getOrDefault(option.candidate().id(), 0L))
                .thenComparingDouble(SubstitutionOption::distanceKm)
                .thenComparing((SubstitutionOption option) -> option.candidate().name(),
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
    }

    private OpcionesSustitucionResponse toSubstitutionResponse(CircuitoItem target, SubstitutionAnalysis analysis) {
        SubstitutionWindow window = analysis.window();
        List<OpcionSustitucionResponse> opciones = analysis.options().stream()
                .map(option -> toSubstitutionOptionResponse(option, analysis.likeCounts()))
                .toList();
        return new OpcionesSustitucionResponse(target.getFecha(), window.start(), window.end(),
                toNeighbor(window.previous()), toNeighbor(window.next()), opciones, analysis.notFitting(),
                opciones.isEmpty()
                        ? "No hay propuestas que entren en ese hueco del día sin romper el itinerario"
                        : null);
    }

    private OpcionSustitucionResponse toSubstitutionOptionResponse(SubstitutionOption option,
            Map<Long, Long> likeCounts) {
        CircuitCandidate candidate = option.candidate();
        CircuitCandidate.ProposalDetails details = candidate.details();
        String image = details.images().isEmpty() ? null : details.images().get(0);
        return new OpcionSustitucionResponse(candidate.id(), candidate.name(), candidate.description(),
                candidate.type(), candidate.category(), image, details.city(), details.locality(),
                details.address(), details.latitude(), details.longitude(), option.start(), option.end(),
                details.durationMinutes() != null ? details.durationMinutes()
                        : durationMinutes(option.start(), option.end()),
                option.liked(), likeCounts.getOrDefault(candidate.id(), 0L), option.inInterests(),
                option.distanceKm(), option.travelMinutes());
    }

    private ParadaVecinaResponse toNeighbor(CircuitoItem item) {
        if (item == null) {
            return null;
        }
        return new ParadaVecinaResponse(item.getPropuestaNombre(), item.getHoraInicio(), item.getHoraFin(),
                item.getLatitud(), item.getLongitud());
    }

    private static int minuteOfDay(LocalTime time) {
        return time.getHour() * 60 + time.getMinute();
    }

    private static String clock(LocalTime time) {
        return String.format("%02d:%02d", time.getHour(), time.getMinute());
    }

    private static String kilometers(double value) {
        return String.format(java.util.Locale.ROOT, "%.1f", value).replace('.', ',');
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
        Viaje viaje = viajeRepository.findByIdAndEstadoNotIn(id,
                List.of(com.viajesazo.turismo_backend.model.EstadoViaje.CANCELADO))
                .orElseThrow(() -> new ResourceNotFoundException("No existe el viaje con id " + id));
        Long currentId = com.viajesazo.turismo_backend.security.SecurityUtils.currentUsuarioId();
        if (viaje.getUsuario() == null || !viaje.getUsuario().getId().equals(currentId)) {
            throw new ResourceNotFoundException("No existe el viaje con id " + id);
        }
        return viaje;
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
        if (viaje.getRitmo() == TipoRitmo.MANUAL
                && (viaje.getDiasPlan() == null || viaje.getDiasPlan().isEmpty())) {
            missing.add("plan diario de eventos y actividades");
        }
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

    private Map<LocalDate, DayQuota> dayQuotas(Viaje viaje) {
        if (viaje.getRitmo() != TipoRitmo.MANUAL || viaje.getDiasPlan() == null) {
            return Map.of();
        }
        Map<LocalDate, DayQuota> quotas = new HashMap<>();
        for (ViajeDiaPlan dia : viaje.getDiasPlan()) {
            if (dia.getFecha() == null) {
                continue;
            }
            quotas.put(dia.getFecha(), new DayQuota(dia.getCantidadEventos(), dia.getCantidadActividades()));
        }
        return quotas;
    }

    private Map<Long, Long> likeCounts(List<Long> propuestaIds) {
        if (propuestaIds == null || propuestaIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : meGustaRepository.countByPropuestaIdIn(propuestaIds)) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
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
            item.setOrigen(OrigenCircuitoItem.GENERADO);
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

    private void requireDateInRange(Circuito circuito, CircuitoAlternativa alternative, LocalDate fecha) {
        LocalDate start = selectedStart(circuito, alternative);
        LocalDate end = selectedEnd(circuito, alternative);
        if (start == null || end == null || fecha.isBefore(start) || fecha.isAfter(end)) {
            throw new ResourceNotFoundException("No existe el día " + fecha + " en el circuito seleccionado");
        }
    }

    private void ensureDayStates(Circuito circuito, Viaje viaje) {
        if (circuito.getDiasEstado() == null) {
            circuito.setDiasEstado(new ArrayList<>());
        }
        if (circuito.getDiasEstado().isEmpty() && circuito.getEstrategiaSeleccionada() != null) {
            rebuildDayStates(circuito, viaje);
        }
    }

    private void rebuildDayStates(Circuito circuito, Viaje viaje) {
        CircuitoAlternativa alternative = selectedAlternative(circuito);
        LocalDate start = selectedStart(circuito, alternative);
        LocalDate end = selectedEnd(circuito, alternative);
        circuito.getDiasEstado().clear();
        if (start == null || end == null) {
            return;
        }
        // Lo que el turista sumó con sugerencias antes de confirmar cuenta como "agregado por vos",
        // no como asignado por la generación.
        Map<LocalDate, Long> counts = alternative.getItems().stream()
                .filter(item -> item.getFecha() != null)
                .filter(item -> item.getOrigen() != OrigenCircuitoItem.SUGERENCIA_ACEPTADA)
                .collect(Collectors.groupingBy(CircuitoItem::getFecha, Collectors.counting()));
        Map<LocalDate, Long> added = alternative.getItems().stream()
                .filter(item -> item.getFecha() != null)
                .filter(item -> item.getOrigen() == OrigenCircuitoItem.SUGERENCIA_ACEPTADA)
                .collect(Collectors.groupingBy(CircuitoItem::getFecha, Collectors.counting()));
        Map<LocalDate, DayQuota> quotas = dayQuotas(viaje);
        TipoRitmo ritmo = circuito.getRitmoSnapshot() != null ? circuito.getRitmoSnapshot() : viaje.getRitmo();
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            int asignadas = counts.getOrDefault(date, 0L).intValue();
            int agregadas = added.getOrDefault(date, 0L).intValue();
            int minimo = dayMinimum(ritmo, quotas.get(date));
            String mensaje = null;
            if (minimo > 0 && asignadas + agregadas < minimo) {
                mensaje = incompleteDayMessage(asignadas + agregadas, minimo);
            }
            CircuitoDiaEstado estado = new CircuitoDiaEstado(date, asignadas, minimo, mensaje);
            estado.setAgregadasPorUsuario(agregadas);
            circuito.getDiasEstado().add(estado);
        }
    }

    private int dayMinimum(TipoRitmo ritmo, DayQuota quota) {
        if (ritmo == TipoRitmo.MANUAL) {
            return quota == null ? 0 : Math.max(0, quota.events()) + Math.max(0, quota.activities());
        }
        return switch (ritmo == null ? TipoRitmo.EQUILIBRADO : ritmo) {
            case TRANQUILO -> 2;
            case EQUILIBRADO -> 4;
            case INTENSIVO -> 5;
            case MANUAL -> 0;
        };
    }

    private CircuitoDiaEstado dayState(Circuito circuito, LocalDate fecha) {
        return circuito.getDiasEstado().stream()
                .filter(estado -> fecha.equals(estado.getFecha()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe el día " + fecha + " en el circuito seleccionado"));
    }

    private ResumenDiaCircuito buildResumen(Circuito circuito, LocalDate fecha) {
        CircuitoDiaEstado estado = circuito.getDiasEstado().stream()
                .filter(item -> fecha.equals(item.getFecha()))
                .findFirst()
                .orElse(null);
        if (estado == null) {
            return new ResumenDiaCircuito(0, 0, 0, false, null, false, false);
        }
        LocalDate today = LocalDate.now(clock);
        boolean futureOrToday = !fecha.isBefore(today);
        boolean pendiente = (estado.getAsignadas() + estado.getAgregadasPorUsuario()) < estado.getMinimo()
                && !estado.isAvisoDescartado()
                && futureOrToday
                && estado.getMinimo() > 0;
        return new ResumenDiaCircuito(
                estado.getAsignadas(),
                estado.getMinimo(),
                estado.getAgregadasPorUsuario(),
                estado.isAvisoDescartado(),
                estado.getMensaje(),
                pendiente,
                pendiente);
    }

    private List<SuggestionOption> suggestionOptions(Viaje viaje, Circuito circuito,
            CircuitoAlternativa alternative, LocalDate fecha, boolean dayIncomplete) {
        if (!dayIncomplete) {
            return List.of();
        }
        TipoRitmo ritmo = circuito.getRitmoSnapshot() != null ? circuito.getRitmoSnapshot() : viaje.getRitmo();
        Set<InteresCategoria> interests = new LinkedHashSet<>(
                viaje.getInteresesCategoria() == null ? List.of() : viaje.getInteresesCategoria());
        Set<Long> used = alternative.getItems().stream()
                .map(CircuitoItem::getPropuestaId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<Long> likedIds = meGustaRepository.findPropuestaIdsByUsuarioId(viaje.getUsuario().getId());

        DayQuota quota = dayQuotas(viaje).get(fecha);
        int events = (int) sortedDayItems(alternative, fecha).stream()
                .filter(item -> item.getTipo() == TipoRegistro.EVENTO).count();
        int activities = (int) sortedDayItems(alternative, fecha).stream()
                .filter(item -> item.getTipo() == TipoRegistro.ACTIVIDAD).count();
        boolean needEvents = ritmo == TipoRitmo.MANUAL && quota != null && events < quota.events();
        boolean needActivities = ritmo == TipoRitmo.MANUAL && quota != null && activities < quota.activities();

        List<SuggestionOption> otraCategoria = new ArrayList<>();
        List<SuggestionOption> otroTipo = new ArrayList<>();

        for (PropuestaTuristica proposal : propuestaRepository.findAll()) {
            if (proposal.getId() == null || used.contains(proposal.getId())
                    || !isEligibleIgnoringCategory(viaje, proposal)) {
                continue;
            }
            MotivoSugerencia motivo = classifySuggestion(proposal, interests, ritmo, needEvents, needActivities);
            if (motivo == null) {
                continue;
            }
            SuggestionOption fitted = firstFittingSuggestion(alternative, fecha, proposal, motivo);
            if (fitted == null) {
                continue;
            }
            if (motivo == MotivoSugerencia.OTRA_CATEGORIA) {
                otraCategoria.add(fitted);
            } else {
                otroTipo.add(fitted);
            }
        }

        Map<Long, Long> likeCounts = likeCounts(java.util.stream.Stream
                .concat(otraCategoria.stream(), otroTipo.stream())
                .map(option -> option.candidate().id())
                .toList());
        Comparator<SuggestionOption> order = suggestionOrder(likedIds, likeCounts);
        otraCategoria.sort(order);
        otroTipo.sort(order);

        List<SuggestionOption> result = new ArrayList<>();
        otraCategoria.stream().limit(MAX_SUGERENCIAS_POR_MOTIVO).forEach(result::add);
        if (ritmo == TipoRitmo.MANUAL) {
            otroTipo.stream().limit(MAX_SUGERENCIAS_POR_MOTIVO).forEach(result::add);
        }
        return result;
    }

    private MotivoSugerencia classifySuggestion(PropuestaTuristica proposal, Set<InteresCategoria> interests,
            TipoRitmo ritmo, boolean needEvents, boolean needActivities) {
        InteresCategoria category = proposal.getCategoria();
        TipoRegistro type = proposal.getTipo();
        if (category == null || type == null) {
            return null;
        }
        boolean inInterests = interests.contains(category);
        if (ritmo == TipoRitmo.MANUAL) {
            if (!needEvents && !needActivities) {
                return null;
            }
            if (!inInterests) {
                if ((type == TipoRegistro.EVENTO && needEvents)
                        || (type == TipoRegistro.ACTIVIDAD && needActivities)) {
                    return MotivoSugerencia.OTRA_CATEGORIA;
                }
                return null;
            }
            if (type == TipoRegistro.EVENTO && !needEvents && needActivities) {
                return MotivoSugerencia.OTRO_TIPO;
            }
            if (type == TipoRegistro.ACTIVIDAD && !needActivities && needEvents) {
                return MotivoSugerencia.OTRO_TIPO;
            }
            return null;
        }
        // Ritmos no manuales: solo OTRA_CATEGORIA (categoría fuera de intereses).
        if (!inInterests) {
            return MotivoSugerencia.OTRA_CATEGORIA;
        }
        return null;
    }

    /**
     * Misma base que {@link #isEligible} sin exigir categoría ∈ intereses.
     * La generación y los reemplazos siguen usando {@link #isEligible} estricto.
     */
    private boolean isEligibleIgnoringCategory(Viaje viaje, PropuestaTuristica proposal) {
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
                || viaje.getRangoInteresKm() == null) {
            return false;
        }
        double distance = distanceProvider.estimate(
                zone.getLatitud().doubleValue(), zone.getLongitud().doubleValue(),
                location.getLatitud().doubleValue(), location.getLongitud().doubleValue()).distanceKm();
        return distance <= viaje.getRangoInteresKm();
    }

    private SuggestionOption firstFittingSuggestion(CircuitoAlternativa alternative, LocalDate fecha,
            PropuestaTuristica proposal, MotivoSugerencia motivo) {
        for (CircuitCandidate.TimeSlot slot : proposalSlots(proposal, fecha)) {
            if (overlapsAnyItem(alternative, fecha, slot.start(), slot.end())) {
                continue;
            }
            TransferEstimate transfer = transferForInsert(alternative, fecha, proposal, slot.start(), slot.end());
            if (transfer == null) {
                continue;
            }
            return new SuggestionOption(toCandidate(proposal, List.of(slot)), slot.start(), slot.end(),
                    motivo, transfer.km(), transfer.minutes());
        }
        return null;
    }

    private record TransferEstimate(double km, int minutes) {
    }

    private boolean overlapsAnyItem(CircuitoAlternativa alternative, LocalDate fecha,
            LocalTime start, LocalTime end) {
        return alternative.getItems().stream()
                .filter(item -> Objects.equals(fecha, item.getFecha()))
                .filter(item -> item.getHoraInicio() != null && item.getHoraFin() != null)
                .anyMatch(item -> start.isBefore(item.getHoraFin()) && end.isAfter(item.getHoraInicio()));
    }

    private TransferEstimate transferForInsert(CircuitoAlternativa alternative, LocalDate fecha,
            PropuestaTuristica proposal, LocalTime start, LocalTime end) {
        List<CircuitoItem> ordered = sortedDayItems(alternative, fecha);
        CircuitoItem previous = null;
        CircuitoItem next = null;
        for (CircuitoItem item : ordered) {
            if (item.getHoraInicio() != null && !item.getHoraInicio().isAfter(start)) {
                previous = item;
            }
            if (next == null && item.getHoraInicio() != null && item.getHoraInicio().isAfter(start)) {
                next = item;
            }
        }
        Ubicacion location = proposal.getUbicacion();
        double km = 0;
        int minutes = 0;
        if (previous != null) {
            if (previous.getHoraFin() != null && hasCoordinates(previous)) {
                TravelEstimate estimate = distanceProvider.estimate(
                        previous.getLatitud().doubleValue(), previous.getLongitud().doubleValue(),
                        location.getLatitud().doubleValue(), location.getLongitud().doubleValue());
                if (start.isBefore(previous.getHoraFin().plusMinutes(estimate.durationMinutes()))) {
                    return null;
                }
                km = estimate.distanceKm();
                minutes = estimate.durationMinutes();
            }
        }
        if (next != null && next.getHoraInicio() != null && hasCoordinates(next)) {
            TravelEstimate estimate = distanceProvider.estimate(
                    location.getLatitud().doubleValue(), location.getLongitud().doubleValue(),
                    next.getLatitud().doubleValue(), next.getLongitud().doubleValue());
            if (next.getHoraInicio().isBefore(end.plusMinutes(estimate.durationMinutes()))) {
                return null;
            }
        }
        return new TransferEstimate(km, minutes);
    }

    private Comparator<SuggestionOption> suggestionOrder(Set<Long> likedIds, Map<Long, Long> likeCounts) {
        return Comparator
                .<SuggestionOption, Boolean>comparing(
                        option -> !likedIds.contains(option.candidate().id()))
                .thenComparing((SuggestionOption option) ->
                        -likeCounts.getOrDefault(option.candidate().id(), 0L))
                .thenComparingDouble(SuggestionOption::transferKm)
                .thenComparing(option -> option.candidate().name(),
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
    }

    private SugerenciaDiaResponse toSuggestionResponse(SuggestionOption option) {
        CircuitCandidate candidate = option.candidate();
        CircuitCandidate.ProposalDetails details = candidate.details();
        return new SugerenciaDiaResponse(
                candidate.id(),
                candidate.name(),
                candidate.type(),
                candidate.category(),
                option.motivo(),
                textoMotivo(option.motivo(), candidate.category(), candidate.type()),
                option.start(),
                option.end(),
                option.transferKm(),
                option.transferMinutes(),
                details.durationMinutes() != null
                        ? details.durationMinutes()
                        : durationMinutes(option.start(), option.end()),
                details.images() == null ? List.of() : List.copyOf(details.images()),
                details.city(),
                details.locality(),
                details.address(),
                details.venue(),
                details.latitude(),
                details.longitude(),
                details.accessType(),
                details.price(),
                details.priceDescription(),
                details.officialSite(),
                candidate.description());
    }

    private String textoMotivo(MotivoSugerencia motivo, InteresCategoria categoria, TipoRegistro tipo) {
        if (motivo == MotivoSugerencia.OTRA_CATEGORIA) {
            return "Fuera de tus preferencias: " + categoriaLabel(categoria);
        }
        if (tipo == TipoRegistro.ACTIVIDAD) {
            return "Es una actividad en lugar de un evento";
        }
        return "Es un evento en lugar de una actividad";
    }

    private String categoriaLabel(InteresCategoria categoria) {
        if (categoria == null) {
            return "Sin categoría";
        }
        return switch (categoria) {
            case NATURALEZA -> "Naturaleza";
            case GASTRONOMIA -> "Gastronomía";
            case CULTURA -> "Cultura";
            case HISTORIA -> "Historia";
            case AVENTURA -> "Aventura";
            case VIDA_NOCTURNA -> "Vida nocturna";
            case MUSICA -> "Música";
            case COMPRAS -> "Compras";
            case FAMILIAR_Y_RELAX -> "Familiar y relax";
        };
    }
}

