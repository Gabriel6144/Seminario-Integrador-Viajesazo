package com.viajesazo.turismo_backend.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.viajesazo.turismo_backend.exception.BusinessRuleException;

/**
 * Guarda las imágenes que sube el publicador en disco y devuelve la URL con la que se sirven.
 *
 * <p>No hay entidad ni tabla de imágenes: la URL que devuelve este service se agrega al
 * {@code List<String> imagenes} del {@code Evento}, que es una {@code @ElementCollection}. O sea,
 * el contrato del evento no cambia; lo único que cambia es de dónde sale el string.
 *
 * <p>El tipo de archivo se detecta por la <b>firma de bytes</b> (magic numbers), nunca por la
 * extensión ni por el {@code Content-Type} que manda el cliente: los dos son datos de entrada no
 * confiables. Si la firma no corresponde a un formato aceptado, se rechaza con 400.
 */
@Service
public class ImagenService {

	/** Tope de tamaño. El contenedor ya corta a 5MB (multipart), esto es la red de seguridad. */
	static final long MAX_BYTES = 5L * 1024 * 1024;

	private final Path directorio;
	private final String urlBase;

	public ImagenService(
			@Value("${app.imagenes.dir}") String directorio,
			@Value("${app.imagenes.url-base}") String urlBase) {
		this.directorio = Path.of(directorio).toAbsolutePath().normalize();
		this.urlBase = urlBase;
	}

	/**
	 * Valida y persiste el archivo con un nombre aleatorio. Devuelve la URL pública
	 * ({@code /api/imagenes/{uuid}.{ext}}) que el cliente usa como imagen del evento.
	 */
	public String guardar(MultipartFile archivo) {
		if (archivo == null || archivo.isEmpty()) {
			throw new BusinessRuleException("no se recibió ningún archivo de imagen");
		}
		if (archivo.getSize() > MAX_BYTES) {
			throw new BusinessRuleException("la imagen no puede superar los 5 MB");
		}

		String extension = detectarExtension(archivo);
		String nombre = UUID.randomUUID() + "." + extension;

		try {
			Files.createDirectories(directorio);
			try (InputStream entrada = archivo.getInputStream()) {
				Files.copy(entrada, directorio.resolve(nombre), StandardCopyOption.REPLACE_EXISTING);
			}
		} catch (IOException ex) {
			// Escribir en disco es un fallo del servidor, no del cliente: 500.
			throw new IllegalStateException("no se pudo guardar la imagen en disco", ex);
		}

		return urlBase + "/" + nombre;
	}

	/**
	 * Borra una imagen subida. El nombre se valida contra el patrón que genera {@link #guardar}
	 * para que no se pueda salir del directorio con {@code ../} ni con rutas absolutas.
	 */
	public void borrar(String nombre) {
		if (nombre == null || !nombre.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}"
				+ "-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.(jpg|jpeg|png|gif|webp)")) {
			throw new BusinessRuleException("el nombre de la imagen no es válido");
		}
		try {
			Files.deleteIfExists(directorio.resolve(nombre));
		} catch (IOException ex) {
			throw new IllegalStateException("no se pudo borrar la imagen", ex);
		}
	}

	/** Lee la cabecera y decide el formato. Lanza 400 si no es una imagen aceptada. */
	private String detectarExtension(MultipartFile archivo) {
		byte[] cabecera;
		try (InputStream entrada = archivo.getInputStream()) {
			cabecera = entrada.readNBytes(12);
		} catch (IOException ex) {
			throw new IllegalStateException("no se pudo leer la imagen", ex);
		}

		if (esJpeg(cabecera)) return "jpg";
		if (esPng(cabecera)) return "png";
		if (esGif(cabecera)) return "gif";
		if (esWebp(cabecera)) return "webp";

		throw new BusinessRuleException(
				"el archivo no es una imagen válida (se aceptan JPG, PNG, WEBP o GIF)");
	}

	private static boolean esJpeg(byte[] b) {
		return b.length >= 3
				&& (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
	}

	private static boolean esPng(byte[] b) {
		return b.length >= 8
				&& (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
				&& (b[4] & 0xFF) == 0x0D && (b[5] & 0xFF) == 0x0A
				&& (b[6] & 0xFF) == 0x1A && (b[7] & 0xFF) == 0x0A;
	}

	private static boolean esGif(byte[] b) {
		return b.length >= 6
				&& b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8'
				&& (b[4] == '7' || b[4] == '9') && b[5] == 'a';
	}

	private static boolean esWebp(byte[] b) {
		return b.length >= 12
				&& b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
				&& b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
	}

}
