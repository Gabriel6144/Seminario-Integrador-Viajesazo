package com.viajesazo.turismo_backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.viajesazo.turismo_backend.dto.request.PublicadorRequest;
import com.viajesazo.turismo_backend.dto.response.PublicadorResponse;
import com.viajesazo.turismo_backend.model.Publicador;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface PublicadorMapper {

	@Mapping(target = "id", ignore = true)
	Publicador toEntity(PublicadorRequest request);

	PublicadorResponse toResponse(Publicador publicador);

}
