package com.viajesazo.turismo_backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.viajesazo.turismo_backend.dto.response.ImagenResponse;
import com.viajesazo.turismo_backend.service.ImagenService;

/**
 * Subida de imágenes de un evento.
 *
 * <p>No está anidado bajo {@code /api/eventos}: la subida es <b>previa</b> al alta del evento
 * (staging). El publicador sube el archivo, recibe la URL y esa URL viaja en el {@code imagenes}
 * del {@code POST /api/eventos}. Así una sola petición de alta deja el evento completo, sin tener
 * que crearlo primero y editarlo después.
 */
@RestController
@RequestMapping("/api/imagenes")
public class ImagenController {

	private final ImagenService imagenService;

	public ImagenController(ImagenService imagenService) {
		this.imagenService = imagenService;
	}

	/** Alta. Responde 201 con `{"url": "/api/imagenes/{uuid}.{ext}"}`. */
	@PostMapping
	public ResponseEntity<ImagenResponse> subir(@RequestParam("archivo") MultipartFile archivo) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ImagenResponse(imagenService.guardar(archivo)));
	}

	/**
	 * Baja. Existe para poder limpiar un archivo que quedó huérfano (se subió y al final el evento
	 * no se guardó). Responde 204 sin cuerpo, como el resto de las bajas.
	 */
	@DeleteMapping("/{nombre}")
	public ResponseEntity<Void> borrar(@PathVariable String nombre) {
		imagenService.borrar(nombre);
		return ResponseEntity.noContent().build();
	}

}
