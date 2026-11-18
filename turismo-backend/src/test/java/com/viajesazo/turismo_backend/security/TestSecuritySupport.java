package com.viajesazo.turismo_backend.security;

import java.util.List;
import java.util.Set;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.Usuario;

/**
 * Helpers para armar el SecurityContext en tests unitarios de service.
 */
public final class TestSecuritySupport {

	private TestSecuritySupport() {
	}

	public static Usuario turista(Long id, String email) {
		return Usuario.builder()
				.id(id)
				.nombre("Turista")
				.email(email)
				.contrasena("hash")
				.activo(true)
				.roles(Set.of(Rol.TURISTA))
				.build();
	}

	public static void authenticate(Usuario usuario, Long publicadorId, Rol... roles) {
		List<SimpleGrantedAuthority> authorities = java.util.Arrays.stream(roles)
				.map(r -> new SimpleGrantedAuthority("ROLE_" + r.name()))
				.toList();
		UsuarioPrincipal principal = UsuarioPrincipal.builder()
				.id(usuario.getId())
				.email(usuario.getEmail())
				.password(usuario.getContrasena())
				.authorities(authorities)
				.publicadorId(publicadorId)
				.activo(true)
				.build();
		SecurityContextHolder.getContext().setAuthentication(
				new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
	}

	public static void authenticateTurista(Usuario usuario) {
		authenticate(usuario, null, Rol.TURISTA);
	}

	public static void clear() {
		SecurityContextHolder.clearContext();
	}

}
