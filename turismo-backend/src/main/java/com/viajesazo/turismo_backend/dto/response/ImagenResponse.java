package com.viajesazo.turismo_backend.dto.response;

/**
 * Respuesta del alta de una imagen. Solo lleva la URL con la que queda servida.
 *
 * <p>Espejo en el frontend: `ImagenResponse` en `src/types/api.ts`.
 */
public record ImagenResponse(String url) {}
