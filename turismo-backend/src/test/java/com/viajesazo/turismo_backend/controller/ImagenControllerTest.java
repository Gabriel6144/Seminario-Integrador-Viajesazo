package com.viajesazo.turismo_backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.viajesazo.turismo_backend.config.AppConfig;
import com.viajesazo.turismo_backend.exception.BusinessRuleException;
import com.viajesazo.turismo_backend.service.ImagenService;

@WebMvcTest(ImagenController.class)
// @WebMvcTest es un slice: el Clock que inyecta GlobalExceptionHandler no se cargaría solo.
@Import(AppConfig.class)
class ImagenControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private ImagenService imagenService;

	@Test
	@DisplayName("sube una imagen y responde 201 con la URL")
	void uploadsImage() throws Exception {
		when(imagenService.guardar(any())).thenReturn("/api/imagenes/abc.png");
		MockMultipartFile archivo = new MockMultipartFile(
				"archivo", "foto.png", "image/png", "contenido".getBytes());

		mockMvc.perform(multipart("/api/imagenes").file(archivo))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.url").value("/api/imagenes/abc.png"));
	}

	@Test
	@DisplayName("un archivo no válido se rechaza con 400")
	void rejectsInvalidFile() throws Exception {
		when(imagenService.guardar(any())).thenThrow(new BusinessRuleException(
				"el archivo no es una imagen válida (se aceptan JPG, PNG, WEBP o GIF)"));
		MockMultipartFile archivo = new MockMultipartFile(
				"archivo", "x.txt", "text/plain", "hola".getBytes());

		mockMvc.perform(multipart("/api/imagenes").file(archivo))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message")
						.value("el archivo no es una imagen válida (se aceptan JPG, PNG, WEBP o GIF)"));
	}

	@Test
	@DisplayName("sin la parte 'archivo' responde 400 y no 500")
	void rejectsMissingPart() throws Exception {
		mockMvc.perform(multipart("/api/imagenes"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("falta el archivo a subir"));
	}

	@Test
	@DisplayName("borra una imagen y responde 204 sin cuerpo")
	void deletesImage() throws Exception {
		mockMvc.perform(delete("/api/imagenes/abc.png"))
				.andExpect(status().isNoContent());

		verify(imagenService).borrar("abc.png");
	}

}
