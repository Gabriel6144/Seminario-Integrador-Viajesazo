package com.viajesazo.turismo_backend.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.viajesazo.turismo_backend.config.AppConfig;
import com.viajesazo.turismo_backend.service.ImagenService;

/**
 * Sirve las imágenes subidas como estáticos, vía {@link com.viajesazo.turismo_backend.config.WebConfig}.
 *
 * <p>Cubre el bug de ruteo que tenía el proyecto: con el prefijo de servido solapado con
 * {@code ImagenController} ({@code /api/imagenes}), un {@code GET /api/imagenes/{archivo}} hacía
 * match con el {@code @DeleteMapping("/{nombre}")} y Spring lanzaba una excepción de método no
 * soportado (que el catch-all de {@code GlobalExceptionHandler} convertía en 500) <b>antes</b> de
 * llegar al resource handler, así que la imagen subida no se veía nunca. La solución fue servir
 * bajo un prefijo propio ({@code /api/archivos}) que ningún controller mapea.
 */
@WebMvcTest(ImagenController.class)
@Import(AppConfig.class)
@TestPropertySource(properties = "app.imagenes.dir=./target/test-imagenes-serving")
class ImagenServingTest {

	/** Firma PNG válida (primeros 8 bytes) más relleno. */
	private static final byte[] PNG = {
			(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0
	};

	private static final Path DIR = Path.of("./target/test-imagenes-serving");

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private ImagenService imagenService;

	@BeforeEach
	void prepararDirectorio() throws Exception {
		Files.createDirectories(DIR);
	}

	@Test
	@DisplayName("sirve la imagen subida bajo /api/archivos con el content-type de la imagen")
	void servesUploadedImage() throws Exception {
		Files.write(DIR.resolve("abc.png"), PNG);

		mockMvc.perform(get("/api/archivos/abc.png"))
				.andExpect(status().isOk())
				.andExpect(content().contentType("image/png"));
	}

	@Test
	@DisplayName("una imagen inexistente responde 404 y no 500")
	void missingImageIsNotFound() throws Exception {
		mockMvc.perform(get("/api/archivos/no-existe.png"))
				.andExpect(status().isNotFound());
	}

}
