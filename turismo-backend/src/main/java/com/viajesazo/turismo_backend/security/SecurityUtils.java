package com.viajesazo.turismo_backend.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Acceso al principal autenticado desde la capa de servicio (ownership / ABAC).
 */
public final class SecurityUtils {

	private SecurityUtils() {
	}

	public static UsuarioPrincipal currentPrincipal() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !(authentication.getPrincipal() instanceof UsuarioPrincipal principal)) {
			throw new AccessDeniedException("no hay un usuario autenticado");
		}
		return principal;
	}

	public static Long currentUsuarioId() {
		return currentPrincipal().getId();
	}

}
