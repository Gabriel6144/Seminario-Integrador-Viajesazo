package com.viajesazo.turismo_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import com.viajesazo.turismo_backend.exception.BusinessRuleException;

/**
 * Tests del {@link ImagenService}.
 *
 * <p>Se instancia a mano con un {@link TempDir} en vez de levantar contexto: el service no tiene
 * dependencias de Spring más que las dos propiedades de configuración, que se pasan por
 * constructor. Así cada test escribe en su propia carpeta temporal y no ensucia {@code data/}.
 */
class ImagenServiceTest {

	/** Firma PNG válida (primeros 8 bytes) más relleno. */
	private static final byte[] PNG = {
			(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0
	};

	@TempDir
	Path tempDir;

	private ImagenService service() {
		return new ImagenService(tempDir.toString(), "/api/imagenes");
	}

	@Test
	@DisplayName("guarda una imagen válida y devuelve una URL con nombre UUID y la extensión detectada")
	void savesValidImage() {
		MockMultipartFile archivo = new MockMultipartFile("archivo", "foto.png", "image/png", PNG);

		String url = service().guardar(archivo);

		assertThat(url).matches("/api/imagenes/[0-9a-fA-F-]{36}\\.png");
		String nombre = url.substring(url.lastIndexOf('/') + 1);
		assertThat(Files.exists(tempDir.resolve(nombre))).isTrue();
	}

	@Test
	@DisplayName("rechaza un archivo vacío")
	void rejectsEmptyFile() {
		MockMultipartFile archivo = new MockMultipartFile("archivo", "vacio.png", "image/png", new byte[0]);

		assertThatThrownBy(() -> service().guardar(archivo))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("no se recibió");
	}

	@Test
	@DisplayName("rechaza un archivo que no es imagen aunque la extensión y el content-type digan .png")
	void rejectsNonImageDespiteExtension() {
		MockMultipartFile archivo = new MockMultipartFile(
				"archivo", "trampa.png", "image/png", "no soy una imagen".getBytes());

		assertThatThrownBy(() -> service().guardar(archivo))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("no es una imagen válida");
	}

	@Test
	@DisplayName("rechaza una imagen que supera los 5 MB")
	void rejectsTooLarge() {
		byte[] grande = new byte[(int) ImagenService.MAX_BYTES + 1];
		// Arranca con firma PNG para que falle por tamaño y no por tipo.
		System.arraycopy(PNG, 0, grande, 0, PNG.length);
		MockMultipartFile archivo = new MockMultipartFile("archivo", "grande.png", "image/png", grande);

		assertThatThrownBy(() -> service().guardar(archivo))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("5 MB");
	}

	@Test
	@DisplayName("rechaza un nombre con path traversal al borrar")
	void rejectsPathTraversalOnDelete() {
		assertThatThrownBy(() -> service().borrar("../../secret.txt"))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("no es válido");
	}

	@Test
	@DisplayName("borra una imagen previamente guardada")
	void deletesSavedImage() {
		ImagenService service = service();
		String url = service.guardar(new MockMultipartFile("archivo", "foto.png", "image/png", PNG));
		String nombre = url.substring(url.lastIndexOf('/') + 1);

		service.borrar(nombre);

		assertThat(Files.exists(tempDir.resolve(nombre))).isFalse();
	}

}
