package com.viajesazo.turismo_backend.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.viajesazo.turismo_backend.model.Usuario;

/**
 * Hook de envío de mail de recuperación. Hoy solo deja traza en log: no hay SMTP
 * configurado ({@code spring-boot-starter-mail} / plantilla / token de reset).
 */
@Component
public class PasswordResetMailer {

	private static final Logger log = LoggerFactory.getLogger(PasswordResetMailer.class);

	public void sendResetInstructions(Usuario usuario) {
		log.info(
				"reset solicitado para usuarioId={}; envío de mail no configurado (email={})",
				usuario.getId(),
				usuario.getEmail());
	}
}
