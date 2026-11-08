package com.viajesazo.turismo_backend.controller;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
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

import java.util.List;

import com.viajesazo.turismo_backend.dto.request.ViajeBorradorRequest;
import com.viajesazo.turismo_backend.dto.request.SeleccionCircuitoRequest;
import com.viajesazo.turismo_backend.dto.request.ViajeRequest;
import com.viajesazo.turismo_backend.dto.response.ViajeResponse;
import com.viajesazo.turismo_backend.dto.response.GeneracionCircuitoResponse;
import com.viajesazo.turismo_backend.service.CircuitoService;
import com.viajesazo.turismo_backend.service.ViajeService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/viajes")
@RequiredArgsConstructor
public class ViajeController {

    private final ViajeService viajeService;
    private final CircuitoService circuitoService;

    /** VZ-19: registrar viaje. */
    @PostMapping
    public ResponseEntity<ViajeResponse> create(@Valid @RequestBody ViajeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(viajeService.create(request));
    }

    /** VZ-21: modificar viaje. */
    @PutMapping("/{id}")
    public ViajeResponse update(@PathVariable Long id, @Valid @RequestBody ViajeRequest request) {
        return viajeService.update(id, request);
    }

    /**
     * VZ-23: baja lógica (204). La confirmación previa (VZ-23 CA1) es responsabilidad de la UI.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        viajeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** Soporte de VZ-21: detalle para editar. */
    @GetMapping("/{id}")
    public ViajeResponse findById(@PathVariable Long id) {
        return viajeService.findById(id);
    }

    @PostMapping("/{id}/circuito")
    public ResponseEntity<GeneracionCircuitoResponse> generateCircuit(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(circuitoService.generate(id));
    }

    @GetMapping("/{id}/circuito")
    public GeneracionCircuitoResponse findCircuit(@PathVariable Long id) {
        return circuitoService.find(id);
    }

    @PostMapping("/{id}/circuito/seleccion")
    public GeneracionCircuitoResponse selectCircuit(@PathVariable Long id,
            @Valid @RequestBody SeleccionCircuitoRequest request) {
        return circuitoService.select(id, request);
    }

    /** Guarda un borrador parcial del circuito. */
    @PostMapping("/borradores")
    public ResponseEntity<ViajeResponse> saveDraft(@Valid @RequestBody ViajeBorradorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(viajeService.saveDraft(request));
    }

    /** Lista los borradores de un turista, paginados. */
    @GetMapping("/borradores")
    public PagedModel<ViajeResponse> listDrafts(@RequestParam String usuario,
            @PageableDefault(size = 20) Pageable pageable) {
        return new PagedModel<>(viajeService.listDrafts(usuario, pageable));
    }

    /** Modifica/reanuda un borrador. */
    @PutMapping("/borradores/{id}")
    public ViajeResponse updateDraft(@PathVariable Long id, @Valid @RequestBody ViajeBorradorRequest request) {
        return viajeService.updateDraft(id, request);
    }

    /** Recupera un borrador para continuar su planificación. */
    @GetMapping("/borradores/{id}")
    public ViajeResponse findDraft(@PathVariable Long id) {
        return viajeService.findDraftById(id);
    }

    /** Completa el borrador y lo deja como viaje PLANIFICADO. */
    @PostMapping("/borradores/{id}/completar")
    public ViajeResponse completeDraft(@PathVariable Long id) {
        return viajeService.completeDraft(id);
    }

    /** Descarta un borrador (baja lógica: pasa a CANCELADO). */
    @DeleteMapping("/borradores/{id}")
    public ResponseEntity<Void> deleteDraft(@PathVariable Long id) {
        viajeService.deleteDraft(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * VZ-22: listado de viajes permitidos del turista, paginado con {@code ?usuario=&page=&size=}.
     * Sin viajes devuelve una página vacía con 200.
     */
    @GetMapping
    public PagedModel<ViajeResponse> findAll(@RequestParam String usuario,
            @PageableDefault(size = 20) Pageable pageable) {
        return new PagedModel<>(viajeService.findAll(usuario, pageable));
    }

    /**
     * VZ-22: listado de viajes permitidos filtrado por uno o más estados, paginado con {@code ?usuario=&estado=&page=&size=}.
     * Sin viajes devuelve una página vacía con 200.
     * Solo acepta BORRADOR, PLANIFICADO y EN_CURSO.
     */
    @GetMapping("/estado")
    public PagedModel<ViajeResponse> findByEstado(@RequestParam String usuario,
            @RequestParam List<String> estado,
            @PageableDefault(size = 20) Pageable pageable) {
        return new PagedModel<>(viajeService.findByEstados(usuario, estado, pageable));
    }

}
