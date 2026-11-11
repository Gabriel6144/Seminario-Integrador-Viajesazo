package com.viajesazo.turismo_backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.viajesazo.turismo_backend.dto.request.UsuarioRequest;
import com.viajesazo.turismo_backend.dto.response.UsuarioResponse;
import com.viajesazo.turismo_backend.model.Usuario;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface UsuarioMapper {

	/**
	 * La contraseña se ignora a propósito: el hash lo pone {@code UsuarioService}. Si el mapper la
	 * copiara, un olvido en el service guardaría el texto plano.
	 */
	@Mapping(target = "id", ignore = true)
	@Mapping(target = "contrasena", ignore = true)
	Usuario toEntity(UsuarioRequest request);

	UsuarioResponse toResponse(Usuario usuario);

}
