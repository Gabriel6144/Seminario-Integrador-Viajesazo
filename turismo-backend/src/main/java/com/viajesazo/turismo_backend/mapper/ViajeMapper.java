package com.viajesazo.turismo_backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import com.viajesazo.turismo_backend.dto.request.UbicacionRequest;
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

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "estado", ignore = true) // El estado no viene en el Request inicial
    @Mapping(target = "zonaHospedaje", ignore = true) // El Request solo envía una ubicación, asumimos que es zonaInteres
    @Mapping(target = "zonaInteres", source = "ubicacion")
    @Mapping(target = "usuario", source = "usuario")
    @Mapping(target = "interesesCategoria", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    Viaje toEntity(ViajeRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "estado", ignore = true)
    @Mapping(target = "zonaHospedaje", ignore = true)
    @Mapping(target = "zonaInteres", source = "ubicacion")
    @Mapping(target = "usuario", source = "usuario")
    @Mapping(target = "interesesCategoria", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(ViajeRequest request, @MappingTarget Viaje viaje);

    @Mapping(target = "ubicacion", source = "zonaInteres")
    ViajeResponse toResponse(Viaje viaje);


    // ==========================================
    // MAPPINGS ANIDADOS DE UBICACIÓN
    // ==========================================

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "ciudad", source = "ciudadDeInteres")
    Ubicacion toUbicacionEntity(UbicacionRequest request);

    @Mapping(target = "nombre", source = "ciudad")
    UbicacionResponse toUbicacionResponse(Ubicacion ubicacion);
}