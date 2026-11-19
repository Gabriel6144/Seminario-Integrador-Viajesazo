package com.viajesazo.turismo_backend.security;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.Usuario;

import lombok.Builder;
import lombok.Getter;

/**
 * Principal de autenticación. Expone id, email, roles como {@code ROLE_*} y el
 * {@code publicadorId} opcional para ABAC de propuestas.
 */
@Getter
@Builder
public class UsuarioPrincipal implements UserDetails {

	private final Long id;
	private final String email;
	private final String password;
	private final Collection<? extends GrantedAuthority> authorities;
	private final Long publicadorId;
	private final boolean activo;

	public static UsuarioPrincipal from(Usuario usuario) {
		Set<GrantedAuthority> authorities = usuario.getRoles().stream()
				.map(rol -> new SimpleGrantedAuthority("ROLE_" + rol.name()))
				.collect(Collectors.toSet());
		Long publicadorId = usuario.getPublicador() != null ? usuario.getPublicador().getId() : null;
		return UsuarioPrincipal.builder()
				.id(usuario.getId())
				.email(usuario.getEmail())
				.password(usuario.getContrasena())
				.authorities(authorities)
				.publicadorId(publicadorId)
				.activo(usuario.isActivo())
				.build();
	}

	public boolean hasRole(Rol rol) {
		return authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + rol.name()));
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return authorities;
	}

	@Override
	public String getPassword() {
		return password;
	}

	@Override
	public String getUsername() {
		return email;
	}

	@Override
	public boolean isAccountNonExpired() {
		return true;
	}

	@Override
	public boolean isAccountNonLocked() {
		return true;
	}

	@Override
	public boolean isCredentialsNonExpired() {
		return true;
	}

	@Override
	public boolean isEnabled() {
		return activo;
	}

}
