package com.viajesazo.turismo_backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import com.viajesazo.turismo_backend.dto.request.EventoRequest;
import com.viajesazo.turismo_backend.dto.response.EventoResponse;
import com.viajesazo.turismo_backend.model.Evento;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface EventoMapper {

	/**
	 * <p>El {@code publicador} se ignera a propósito: el request trae un
	 * {@code publicadorId} y es el service quien lo resuelve contra el repositorio, para poder
	 * devolver 404 cuando no existe. Mapear el id a una entidad Publicador a mano dejaría el
	 * evento apuntando a un Publicador sin nombre ni email.
	 *
	 * <p>{@code imagenes} con {@link NullValuePropertyMappingStrategy#IGNORE}: si el request
	 * llega sin lista, se conserva la lista vacía que inicializa la entidad en vez de pisarla
	 * con null.
	 */
	@Mapping(target = "id", ignore = true)
	@Mapping(target = "publicador", ignore = true)
	@Mapping(target = "imagenes", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
	Evento toEntity(EventoRequest request);

	/**
	 * Actualización sobre la entidad ya cargada, para no perder el {@code id} ni borrarla y
	 * volver a guardarla. Mismas reglas que {@link #toEntity}.
	 */
	@Mapping(target = "id", ignore = true)
	@Mapping(target = "publicador", ignore = true)
	@Mapping(target = "imagenes", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
	void updateEntity(EventoRequest request, @MappingTarget Evento evento);

	/**
	 * Los campos del publicador se anidan a mano porque el destino es un record: MapStruct no
	 * resuelve solo {@code publicadorId} &larr; {@code publicador.id}.
	 */
	@Mapping(target = "publicadorId", source = "publicador.id")
	@Mapping(target = "publicadorNombre", source = "publicador.nombre")
	EventoResponse toResponse(Evento evento);

}
