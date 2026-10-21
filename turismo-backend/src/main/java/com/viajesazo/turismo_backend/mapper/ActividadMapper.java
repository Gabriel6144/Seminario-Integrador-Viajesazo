package com.viajesazo.turismo_backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import com.viajesazo.turismo_backend.dto.request.ActividadRequest;
import com.viajesazo.turismo_backend.dto.request.DisponibilidadRequest;
import com.viajesazo.turismo_backend.dto.response.ActividadResponse;
import com.viajesazo.turismo_backend.dto.response.DisponibilidadResponse;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.Disponibilidad;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface ActividadMapper {

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "version", ignore = true)
	@Mapping(target = "publicador", ignore = true)
	@Mapping(target = "tipoAcceso", ignore = true)
	@Mapping(target = "estadoPropuesta", ignore = true)
	@Mapping(target = "ubicacion", ignore = true)
	@Mapping(target = "imagenes", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
	@Mapping(target = "disponibilidades", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
	Actividad toEntity(ActividadRequest request);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "version", ignore = true)
	@Mapping(target = "publicador", ignore = true)
	@Mapping(target = "tipoAcceso", ignore = true)
	@Mapping(target = "estadoPropuesta", ignore = true)
	@Mapping(target = "ubicacion", ignore = true)
	@Mapping(target = "imagenes", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
	@Mapping(target = "disponibilidades", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
	void updateEntity(ActividadRequest request, @MappingTarget Actividad actividad);

	Disponibilidad toDisponibilidad(DisponibilidadRequest request);

	DisponibilidadResponse toDisponibilidadResponse(Disponibilidad disponibilidad);

	@Mapping(target = "localidad", source = "ubicacion.localidad")
	@Mapping(target = "direccion", source = "ubicacion.direccion")
	@Mapping(target = "latitud", source = "ubicacion.latitud")
	@Mapping(target = "longitud", source = "ubicacion.longitud")
	@Mapping(target = "publicadorId", source = "publicador.id")
	@Mapping(target = "publicadorNombre", source = "publicador.nombre")
	ActividadResponse toResponse(Actividad actividad);

}
