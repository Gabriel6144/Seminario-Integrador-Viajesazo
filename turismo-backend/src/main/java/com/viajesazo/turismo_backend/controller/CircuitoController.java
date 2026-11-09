package com.viajesazo.turismo_backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.viajesazo.turismo_backend.dto.request.SeleccionCircuitoRequest;
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

    @PostMapping("/seleccion")
    public GeneracionCircuitoResponse select(@PathVariable Long viajeId,
            @Valid @RequestBody SeleccionCircuitoRequest request) {
        return circuitoService.select(viajeId, request);
    }
}
