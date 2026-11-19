package com.viajesazo.turismo_backend.dto.response;

import java.time.LocalDate;

public record DiaRitmoResponse(
		LocalDate fecha,
		int cantidadEventos,
		int cantidadActividades
) {
}
