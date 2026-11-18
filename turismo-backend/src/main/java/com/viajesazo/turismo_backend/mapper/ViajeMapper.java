package com.viajesazo.turismo_backend.mapper;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import com.viajesazo.turismo_backend.dto.request.DiaRitmoRequest;
import com.viajesazo.turismo_backend.dto.request.UbicacionRequest;
import com.viajesazo.turismo_backend.dto.request.ViajeBorradorRequest;
import com.viajesazo.turismo_backend.dto.request.ViajeRequest;
import com.viajesazo.turismo_backend.dto.response.DiaRitmoResponse;
import com.viajesazo.turismo_backend.dto.response.UbicacionResponse;
import com.viajesazo.turismo_backend.dto.response.ViajeResponse;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.model.ViajeDiaPlan;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface ViajeMapper {

    // ==========================================
    // MAPPINGS DE VIAJE
    // ==========================================

    /**
     * El {@code id}, el {@code estado} y el {@code usuario} se ignoran a propósito: los asigna el
     * service (el id lo genera la base, el alta nace {@code PLANIFICADO} y el dueño sale del
     * SecurityContext). La {@code zonaInteres} se mapea desde la {@code ubicacion} del request.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "estado", ignore = true)
    @Mapping(target = "pasoActual", ignore = true)
    @Mapping(target = "usuario", ignore = true)
    @Mapping(target = "creadoEn", ignore = true)
    @Mapping(target = "zonaInteres", source = "ubicacion")
    @Mapping(target = "interesesCategoria", source = "intereses")
    Viaje toEntity(ViajeRequest request);

    /**
     * Actualización sobre la entidad ya cargada, para no perder el {@code id}, el {@code estado}
     * ni el {@code usuario}. La {@code zonaInteres} se ignora acá y se actualiza en sitio con
     * {@link #updateUbicacion(UbicacionRequest, Ubicacion)}.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "estado", ignore = true)
    @Mapping(target = "pasoActual", ignore = true)
    @Mapping(target = "usuario", ignore = true)
    @Mapping(target = "creadoEn", ignore = true)
    @Mapping(target = "zonaInteres", ignore = true)
    @Mapping(target = "interesesCategoria", source = "intereses")
    void updateEntity(ViajeRequest request, @MappingTarget Viaje viaje);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "estado", ignore = true)
    @Mapping(target = "usuario", ignore = true)
    @Mapping(target = "creadoEn", ignore = true)
    @Mapping(target = "zonaInteres", source = "ubicacion")
    @Mapping(target = "interesesCategoria", source = "interesesCategoria")
    Viaje toEntity(ViajeBorradorRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "estado", ignore = true)
    @Mapping(target = "usuario", ignore = true)
    @Mapping(target = "creadoEn", ignore = true)
    @Mapping(target = "zonaInteres", ignore = true)
    @Mapping(target = "interesesCategoria", source = "interesesCategoria")
    void updateEntity(ViajeBorradorRequest request, @MappingTarget Viaje viaje);

    @Mapping(target = "ubicacion", source = "zonaInteres")
    @Mapping(target = "usuarioId", source = "usuario.id")
    @Mapping(target = "usuarioEmail", source = "usuario.email")
    @Mapping(target = "circuito", ignore = true)
    ViajeResponse toResponse(Viaje viaje);


    // ==========================================
    // MAPPINGS ANIDADOS DE UBICACIÓN
    // ==========================================

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "direccion", ignore = true)
    Ubicacion toUbicacionEntity(UbicacionRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "direccion", ignore = true)
    void updateUbicacion(UbicacionRequest request, @MappingTarget Ubicacion ubicacion);

    @Mapping(target = "nombre", source = "ciudad")
    UbicacionResponse toUbicacionResponse(Ubicacion ubicacion);

    ViajeDiaPlan toDiaPlan(DiaRitmoRequest request);

    DiaRitmoResponse toDiaPlanResponse(ViajeDiaPlan plan);

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
