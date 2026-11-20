package com.viajesazo.turismo_backend.dto.response;

import com.viajesazo.turismo_backend.model.TipoRegistro;

/**
 * Propuesta que le podría interesar al turista (le dio Me gusta o es de sus intereses) pero que
 * no puede reemplazar a la parada, con el motivo en palabras: horario, día o distancia.
 */
public record PropuestaFueraDeHuecoResponse(
        Long propuestaId,
        String propuestaNombre,
        TipoRegistro tipo,
        boolean meGusta,
        String motivo) {
}
