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

import com.viajesazo.turismo_backend.dto.request.ViajeRequest;
import com.viajesazo.turismo_backend.dto.response.ViajeResponse;
import com.viajesazo.turismo_backend.service.ViajeService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/viajes")
@RequiredArgsConstructor
public class ViajeController {

    private final ViajeService viajeService;

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

    /**
     * VZ-22: listado de viajes activos del turista, paginado con {@code ?usuario=&page=&size=}.
     * Sin viajes devuelve una página vacía con 200.
     */
    @GetMapping
    public PagedModel<ViajeResponse> findAll(@RequestParam String usuario,
            @PageableDefault(size = 20) Pageable pageable) {
        return new PagedModel<>(viajeService.findAll(usuario, pageable));
    }

}
