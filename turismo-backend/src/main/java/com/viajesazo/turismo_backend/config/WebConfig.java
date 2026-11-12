package com.viajesazo.turismo_backend.config;

import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Sirve las imágenes subidas por el publicador como recursos estáticos.
 *
 * <p>Las guarda {@code ImagenService} en {@code app.imagenes.dir} (fuera del classpath, en disco) y
 * acá se exponen bajo {@code app.imagenes.url-base}. La ruta cuelga de {@code /api} a propósito:
 * así el proxy de Vite la reenvía al backend y el navegador la ve same-origin, exactamente igual
 * que el resto de la API.
 *
 * <p>El prefijo de servido es distinto del de {@code ImagenController}
 * ({@code /api/imagenes}, con POST y DELETE): si se solaparan, un {@code GET} de un archivo
 * haría match con el {@code @DeleteMapping("/{nombre}")} y Spring respondería 405 antes de llegar
 * al resource handler. Por eso el default es {@code /api/archivos}.
 *
 * <p>La carpeta se resuelve a una URI {@code file:} absoluta y con barra final. Una
 * {@code ResourceLocation} sin barra final no resuelve como directorio, así que se agrega acá y no
 * se depende de que la carpeta ya exista: la crea {@code ImagenService} al guardar la primera
 * imagen.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

	private final String urlBase;
	private final String resourceLocation;

	public WebConfig(
			@Value("${app.imagenes.url-base}") String urlBase,
			@Value("${app.imagenes.dir}") String dir) {
		this.urlBase = urlBase;
		String location = Path.of(dir).toAbsolutePath().normalize().toUri().toString();
		this.resourceLocation = location.endsWith("/") ? location : location + "/";
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler(urlBase + "/**").addResourceLocations(resourceLocation);
	}

}
