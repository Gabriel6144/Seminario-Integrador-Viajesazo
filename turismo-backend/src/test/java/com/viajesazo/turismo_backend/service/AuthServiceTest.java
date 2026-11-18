package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.viajesazo.turismo_backend.dto.request.ForgotPasswordRequest;
import com.viajesazo.turismo_backend.dto.request.LoginRequest;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.mapper.UsuarioMapperImpl;
import com.viajesazo.turismo_backend.model.Rol;
import com.viajesazo.turismo_backend.model.Usuario;
import com.viajesazo.turismo_backend.repository.UsuarioRepository;
import com.viajesazo.turismo_backend.security.JwtService;
import com.viajesazo.turismo_backend.security.PasswordResetMailer;
import com.viajesazo.turismo_backend.security.RefreshTokenService;
import com.viajesazo.turismo_backend.security.TestSecuritySupport;
import com.viajesazo.turismo_backend.security.UsuarioPrincipal;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

	private static final String EMAIL = "turista@test.com";
	private static final String PASSWORD = "Turista123!";

	@Mock
	private UsuarioRepository usuarioRepository;

	@Mock
	private JwtService jwtService;

	@Mock
	private RefreshTokenService refreshTokenService;

	@Mock
	private PasswordResetMailer passwordResetMailer;

	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
	private AuthService service;
	private Usuario usuario;

	@BeforeEach
	void setUp() {
		service = new AuthService(usuarioRepository, passwordEncoder, jwtService, refreshTokenService,
				new UsuarioMapperImpl(), passwordResetMailer);
		usuario = Usuario.builder()
				.id(1L)
				.nombre("Turista")
				.email(EMAIL)
				.contrasena(passwordEncoder.encode(PASSWORD))
				.activo(true)
				.roles(new HashSet<>(Set.of(Rol.TURISTA)))
				.build();
	}

	@AfterEach
	void tearDown() {
		TestSecuritySupport.clear();
	}

	@Test
	@DisplayName("login exitoso emite access token y refresh token")
	void loginSuccess() {
		when(usuarioRepository.findByEmailAndActivoTrue(EMAIL)).thenReturn(Optional.of(usuario));
		when(refreshTokenService.create(eq(usuario), any(), any())).thenReturn("refresh-raw");
		when(jwtService.createAccessToken(any(UsuarioPrincipal.class))).thenReturn("access-jwt");
		when(jwtService.getAccessTokenExpiresInSeconds()).thenReturn(900L);

		AuthService.AuthLoginResult result = service.login(new LoginRequest(EMAIL, PASSWORD), "ua", "127.0.0.1");

		assertThat(result.refreshTokenRaw()).isEqualTo("refresh-raw");
		assertThat(result.body().accessToken()).isEqualTo("access-jwt");
		assertThat(result.body().tokenType()).isEqualTo("Bearer");
		assertThat(result.body().expiresInSeconds()).isEqualTo(900L);
		assertThat(result.body().usuario().email()).isEqualTo(EMAIL);
	}

	@Test
	@DisplayName("login con contraseña incorrecta responde 400 genérico")
	void loginBadPassword() {
		when(usuarioRepository.findByEmailAndActivoTrue(EMAIL)).thenReturn(Optional.of(usuario));

		assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, "otra"), null, null))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("email o contraseña incorrectos");
		verify(refreshTokenService, never()).create(any(), any(), any());
	}

	@Test
	@DisplayName("login de cuenta inactiva o inexistente responde 400 genérico")
	void loginInactive() {
		when(usuarioRepository.findByEmailAndActivoTrue(EMAIL)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, PASSWORD), null, null))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("email o contraseña incorrectos");
	}

	@Test
	@DisplayName("refresh rota el token y emite un access nuevo")
	void refreshRotates() {
		when(refreshTokenService.rotate(eq("old-refresh"), any(), any()))
				.thenReturn(new RefreshTokenService.RotatedRefreshToken("new-refresh", usuario));
		when(jwtService.createAccessToken(any(UsuarioPrincipal.class))).thenReturn("access-2");
		when(jwtService.getAccessTokenExpiresInSeconds()).thenReturn(900L);

		AuthService.AuthLoginResult result = service.refresh("old-refresh", "ua", "127.0.0.1");

		assertThat(result.refreshTokenRaw()).isEqualTo("new-refresh");
		assertThat(result.body().accessToken()).isEqualTo("access-2");
	}

	@Test
	@DisplayName("logout revoca el refresh token si viene en la cookie")
	void logoutRevokes() {
		service.logout("refresh-raw");
		verify(refreshTokenService).revoke("refresh-raw");
	}

	@Test
	@DisplayName("logout sin cookie no falla")
	void logoutWithoutCookie() {
		service.logout(null);
		verify(refreshTokenService, never()).revoke(anyString());
	}

	@Test
	@DisplayName("forgot-password con usuario activo dispara el mailer")
	void forgotPasswordExistingUser() {
		when(usuarioRepository.findByEmailAndActivoTrue(EMAIL)).thenReturn(Optional.of(usuario));

		service.forgotPassword(new ForgotPasswordRequest("  Turista@test.com "));

		verify(passwordResetMailer).sendResetInstructions(usuario);
	}

	@Test
	@DisplayName("forgot-password con email inexistente no falla ni envía mail")
	void forgotPasswordUnknownEmail() {
		when(usuarioRepository.findByEmailAndActivoTrue("nadie@test.com")).thenReturn(Optional.empty());

		service.forgotPassword(new ForgotPasswordRequest("nadie@test.com"));

		verify(passwordResetMailer, never()).sendResetInstructions(any());
	}

}
