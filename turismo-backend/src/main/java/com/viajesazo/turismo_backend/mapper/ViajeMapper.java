package com.viajesazo.turismo_backend.mapper;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import com.viajesazo.turismo_backend.dto.request.UbicacionRequest;
import com.viajesazo.turismo_backend.dto.request.ViajeBorradorRequest;
import com.viajesazo.turismo_backend.dto.request.ViajeRequest;
import com.viajesazo.turismo_backend.dto.response.UbicacionResponse;
import com.viajesazo.turismo_backend.dto.response.ViajeResponse;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.model.Viaje;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface ViajeMapper {

    // ==========================================
    // MAPPINGS DE VIAJE
    // ==========================================

    /**
     * El {@code id} y el {@code estado} se ignoran a propósito: los asigna el service
     * (el id lo genera la base y el alta siempre nace {@code PLANIFICADO}). La
     * {@code zonaInteres} se mapea desde la {@code ubicacion} del request; con el
     * {@code cascade = ALL} de la entidad, el guardado persiste la ubicación nueva.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "estado", ignore = true)
    @Mapping(target = "pasoActual", ignore = true)
    @Mapping(target = "zonaInteres", source = "ubicacion")
    @Mapping(target = "interesesCategoria", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    Viaje toEntity(ViajeRequest request);

    /**
     * Actualización sobre la entidad ya cargada, para no perder el {@code id} ni el
     * {@code estado}. La {@code zonaInteres} se ignora acá y se actualiza en sitio con
     * {@link #updateUbicacion(UbicacionRequest, Ubicacion)} para no dejar una fila
     * {@code ubicacion} huérfana en cada modificación.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "estado", ignore = true)
    @Mapping(target = "pasoActual", ignore = true)
    @Mapping(target = "zonaInteres", ignore = true)
    @Mapping(target = "interesesCategoria", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(ViajeRequest request, @MappingTarget Viaje viaje);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "estado", ignore = true)
    @Mapping(target = "zonaInteres", source = "ubicacion")
    @Mapping(target = "interesesCategoria", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    Viaje toEntity(ViajeBorradorRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "estado", ignore = true)
    @Mapping(target = "zonaInteres", ignore = true)
    @Mapping(target = "interesesCategoria", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "pasoActual", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "nombre", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "rangoInteresKm", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "fechaInicio", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "fechaFin", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "ritmo", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(ViajeBorradorRequest request, @MappingTarget Viaje viaje);

    @Mapping(target = "ubicacion", source = "zonaInteres")
    ViajeResponse toResponse(Viaje viaje);


    // ==========================================
    // MAPPINGS ANIDADOS DE UBICACIÓN
    // ==========================================

    @Mapping(target = "id", ignore = true)
    Ubicacion toUbicacionEntity(UbicacionRequest request);

    @Mapping(target = "id", ignore = true)
    void updateUbicacion(UbicacionRequest request, @MappingTarget Ubicacion ubicacion);

    @Mapping(target = "nombre", source = "ciudad")
    UbicacionResponse toUbicacionResponse(Ubicacion ubicacion);


    // ==========================================
    // CONVERSIÓN DE FECHAS (API en LocalDate, persistencia en LocalDateTime)
    // ==========================================

    default LocalDateTime toLocalDateTime(LocalDate fecha) {
        return fecha == null ? null : fecha.atStartOfDay();
    }

    default LocalDate toLocalDate(LocalDateTime fecha) {
        return fecha == null ? null : fecha.toLocalDate();
    }
}
