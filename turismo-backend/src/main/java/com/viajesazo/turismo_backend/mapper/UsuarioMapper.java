package com.viajesazo.turismo_backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.viajesazo.turismo_backend.dto.request.UsuarioRequest;
import com.viajesazo.turismo_backend.dto.response.UsuarioResponse;
import com.viajesazo.turismo_backend.model.Publicador;
import com.viajesazo.turismo_backend.model.Usuario;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface UsuarioMapper {

	/**
	 * La contraseña se ignora a propósito: el hash lo pone {@code UsuarioService}. Si el mapper la
	 * copiara, un olvido en el service guardaría el texto plano. Roles y publicador también los
	 * asigna el service (registro → solo TURISTA).
	 */
	@Mapping(target = "id", ignore = true)
	@Mapping(target = "contrasena", ignore = true)
	@Mapping(target = "activo", ignore = true)
	@Mapping(target = "creadoEn", ignore = true)
	@Mapping(target = "ultimoAccesoEn", ignore = true)
	@Mapping(target = "roles", ignore = true)
	@Mapping(target = "publicador", ignore = true)
	Usuario toEntity(UsuarioRequest request);

	@Mapping(target = "publicadorId", source = "publicador")
	UsuarioResponse toResponse(Usuario usuario);

	default Long mapPublicadorId(Publicador publicador) {
		return publicador == null ? null : publicador.getId();
	}

}
