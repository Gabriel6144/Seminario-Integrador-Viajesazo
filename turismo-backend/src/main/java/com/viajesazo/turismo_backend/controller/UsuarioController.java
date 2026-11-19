package com.viajesazo.turismo_backend.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.viajesazo.turismo_backend.dto.request.AsignarRolesRequest;
import com.viajesazo.turismo_backend.dto.request.BajaUsuarioRequest;
import com.viajesazo.turismo_backend.dto.request.UsuarioRequest;
import com.viajesazo.turismo_backend.dto.request.VincularPublicadorRequest;
import com.viajesazo.turismo_backend.dto.response.BajaUsuarioResponse;
import com.viajesazo.turismo_backend.dto.response.UsuarioResponse;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.service.UsuarioService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

	private final UsuarioService usuarioService;

	/** Registrar usuario: 201 con el usuario creado, 400 si los datos son inválidos o el email ya existe. */
	@PostMapping
	public ResponseEntity<UsuarioResponse> create(@Valid @RequestBody UsuarioRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(usuarioService.create(request));
	}

	/** Listado admin de usuarios activos (paginado, búsqueda y filtro por rol). */
	@GetMapping
	public PagedModel<UsuarioResponse> search(
			@RequestParam(required = false, defaultValue = "") String q,
			@RequestParam(required = false) Rol rol,
			Pageable pageable) {
		Page<UsuarioResponse> page = usuarioService.search(q, rol, pageable);
		return new PagedModel<>(page);
	}

	/** Soporte: consultar el usuario registrado. 404 si no existe o fue dado de baja. */
	@GetMapping("/{id}")
	public UsuarioResponse findById(@PathVariable Long id) {
		return usuarioService.findById(id);
	}

	/**
	 * Baja lógica de la cuenta. Es un {@code POST} y no un {@code DELETE} porque lleva la contraseña
	 * en el body, y hay clientes y proxies que descartan el body de un {@code DELETE}.
	 */
	@PostMapping("/{id}/baja")
	public BajaUsuarioResponse darDeBaja(@PathVariable Long id,
			@Valid @RequestBody BajaUsuarioRequest request,
			@RequestParam(defaultValue = "false") boolean confirmar) {
		return usuarioService.darDeBaja(id, request, confirmar);
	}

	/** Asigna el rol único de la cuenta (solo administrador). */
	@PutMapping("/{id}/roles")
	public UsuarioResponse assignRoles(@PathVariable Long id,
			@Valid @RequestBody AsignarRolesRequest request) {
		return usuarioService.assignRoles(id, request.rol());
	}

	/** Vincula un publicador al usuario y asegura el rol PUBLICADOR (solo administrador). */
	@PutMapping("/{id}/publicador")
	public UsuarioResponse linkPublicador(@PathVariable Long id,
			@Valid @RequestBody VincularPublicadorRequest request) {
		return usuarioService.linkPublicador(id, request.publicadorId());
	}

}
