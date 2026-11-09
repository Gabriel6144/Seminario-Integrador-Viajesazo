package com.viajesazo.turismo_backend.controller;

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

import com.viajesazo.turismo_backend.dto.request.ReemplazoItemCircuitoRequest;
import com.viajesazo.turismo_backend.dto.request.SeleccionCircuitoRequest;
import com.viajesazo.turismo_backend.dto.response.AlternativasReemplazoResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoSeleccionadoResponse;
import com.viajesazo.turismo_backend.dto.response.GeneracionCircuitoResponse;
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
    public AlternativasReemplazoResponse replacementAlternatives(@PathVariable Long viajeId,
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

    @PostMapping("/seleccion")
    public GeneracionCircuitoResponse select(@PathVariable Long viajeId,
            @Valid @RequestBody SeleccionCircuitoRequest request) {
        return circuitoService.select(viajeId, request);
    }
}
