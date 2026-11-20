package com.viajesazo.turismo_backend.dto.response;

import java.time.LocalDate;

/**
 * Estado de un día de una alternativa todavía sin confirmar: cuántas paradas tiene contra las que
 * pidió el turista y si puede completarlo con sugerencias antes de elegir el circuito.
 */
public record ResumenDiaAlternativaResponse(LocalDate fecha, ResumenDiaCircuito resumen) {
}
