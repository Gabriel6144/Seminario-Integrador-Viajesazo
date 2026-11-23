package com.viajesazo.turismo_backend.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.viajesazo.turismo_backend.dto.request.AgregarParadaSugeridaRequest;
import com.viajesazo.turismo_backend.dto.request.DescartarAvisoDiaRequest;
import com.viajesazo.turismo_backend.dto.request.ReemplazoItemCircuitoRequest;
import com.viajesazo.turismo_backend.dto.request.SeleccionCircuitoRequest;
import com.viajesazo.turismo_backend.dto.response.OpcionesSustitucionResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoSeleccionadoResponse;
import com.viajesazo.turismo_backend.dto.response.GeneracionCircuitoResponse;
import com.viajesazo.turismo_backend.dto.response.ResumenDiaAlternativaResponse;
import com.viajesazo.turismo_backend.dto.response.SugerenciasDiaResponse;
import com.viajesazo.turismo_backend.model.CircuitStrategy;
import com.viajesazo.turismo_backend.service.CircuitoService;
import com.viajesazo.turismo_backend.service.CircuitoService.GenerationResult;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/viajes/{viajeId}/circuito")
@RequiredArgsConstructor
public class CircuitoController {

    private final CircuitoService circuitoService;

    @PostMapping
    public ResponseEntity<GeneracionCircuitoResponse> generate(@PathVariable Long viajeId,
            @RequestParam(defaultValue = "false") boolean reemplazar) {
        GenerationResult result = circuitoService.generate(viajeId, reemplazar);
        return ResponseEntity.status(result.replaced() ? HttpStatus.OK : HttpStatus.CREATED)
                .body(result.response());
    }

    @GetMapping
    public GeneracionCircuitoResponse find(@PathVariable Long viajeId) {
        return circuitoService.find(viajeId);
    }

    @GetMapping("/seleccionado")
    public CircuitoSeleccionadoResponse selected(@PathVariable Long viajeId) {
        return circuitoService.selectedDetail(viajeId);
    }

    @GetMapping("/seleccionado/items/{itemId}/alternativas")
    public OpcionesSustitucionResponse replacementAlternatives(@PathVariable Long viajeId,
            @PathVariable Long itemId) {
        return circuitoService.replacementAlternatives(viajeId, itemId);
    }

    @PutMapping("/seleccionado/items/{itemId}")
    public CircuitoSeleccionadoResponse replaceSelectedItem(@PathVariable Long viajeId,
            @PathVariable Long itemId,
            @Valid @RequestBody ReemplazoItemCircuitoRequest request) {
        return circuitoService.replaceSelectedItem(viajeId, itemId, request);
    }

    @DeleteMapping("/seleccionado/items/{itemId}")
    public CircuitoSeleccionadoResponse deleteSelectedItem(@PathVariable Long viajeId,
            @PathVariable Long itemId,
            @RequestParam(defaultValue = "false") boolean confirmar) {
        return circuitoService.deleteSelectedItem(viajeId, itemId, confirmar);
    }

    /** Antes de confirmar: opciones para sustituir una parada de una alternativa todavía sin elegir. */
    @GetMapping("/alternativas/{estrategia}/items/{itemId}/alternativas")
    public OpcionesSustitucionResponse alternativeReplacementOptions(@PathVariable Long viajeId,
            @PathVariable CircuitStrategy estrategia, @PathVariable Long itemId) {
        return circuitoService.alternativeReplacementOptions(viajeId, estrategia, itemId);
    }

    /** Antes de confirmar: sustituye una parada y devuelve todas las alternativas actualizadas. */
    @PutMapping("/alternativas/{estrategia}/items/{itemId}")
    public GeneracionCircuitoResponse replaceAlternativeItem(@PathVariable Long viajeId,
            @PathVariable CircuitStrategy estrategia, @PathVariable Long itemId,
            @Valid @RequestBody ReemplazoItemCircuitoRequest request) {
        return circuitoService.replaceAlternativeItem(viajeId, estrategia, itemId, request);
    }

    /** Antes de confirmar: elimina una parada (pide {@code confirmar=true}). */
    @DeleteMapping("/alternativas/{estrategia}/items/{itemId}")
    public GeneracionCircuitoResponse deleteAlternativeItem(@PathVariable Long viajeId,
            @PathVariable CircuitStrategy estrategia, @PathVariable Long itemId,
            @RequestParam(defaultValue = "false") boolean confirmar) {
        return circuitoService.deleteAlternativeItem(viajeId, estrategia, itemId, confirmar);
    }

    /** Antes de confirmar: qué días de la alternativa quedaron con menos paradas de las pedidas. */
    @GetMapping("/alternativas/{estrategia}/dias")
    public List<ResumenDiaAlternativaResponse> alternativeDaySummaries(@PathVariable Long viajeId,
            @PathVariable CircuitStrategy estrategia) {
        return circuitoService.alternativeDaySummaries(viajeId, estrategia);
    }

    /** Antes de confirmar: sugerencias para completar un día incompleto de la alternativa. */
    @GetMapping("/alternativas/{estrategia}/dias/{fecha}/sugerencias")
    public SugerenciasDiaResponse alternativeDaySuggestions(@PathVariable Long viajeId,
            @PathVariable CircuitStrategy estrategia,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return circuitoService.alternativeDaySuggestions(viajeId, estrategia, fecha);
    }

    /** Antes de confirmar: suma una sugerencia al día y devuelve todas las alternativas actualizadas. */
    @PostMapping("/alternativas/{estrategia}/dias/{fecha}/items")
    public GeneracionCircuitoResponse addAlternativeSuggestedItem(@PathVariable Long viajeId,
            @PathVariable CircuitStrategy estrategia,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @Valid @RequestBody AgregarParadaSugeridaRequest request) {
        return circuitoService.addAlternativeSuggestedItem(viajeId, estrategia, fecha, request);
    }

    @PostMapping("/seleccion")
    public GeneracionCircuitoResponse select(@PathVariable Long viajeId,
            @Valid @RequestBody SeleccionCircuitoRequest request) {
        return circuitoService.select(viajeId, request);
    }

    @GetMapping("/seleccionado/dias/{fecha}/sugerencias")
    public SugerenciasDiaResponse daySuggestions(@PathVariable Long viajeId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return circuitoService.daySuggestions(viajeId, fecha);
    }

    @PostMapping("/seleccionado/dias/{fecha}/items")
    public CircuitoSeleccionadoResponse addSuggestedItem(@PathVariable Long viajeId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @Valid @RequestBody AgregarParadaSugeridaRequest request) {
        return circuitoService.addSuggestedItem(viajeId, fecha, request);
    }

    @PutMapping("/seleccionado/dias/{fecha}/aviso")
    public CircuitoSeleccionadoResponse discardDayNotice(@PathVariable Long viajeId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @Valid @RequestBody DescartarAvisoDiaRequest request) {
        return circuitoService.discardDayNotice(viajeId, fecha, request);
    }
}
