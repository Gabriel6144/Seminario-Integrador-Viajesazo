package com.viajesazo.turismo_backend.dto.response;

import java.util.List;

public record SugerenciasDiaResponse(
		List<SugerenciaDiaResponse> sugerencias,
		List<PropuestaFueraDeHuecoResponse> noEntran,
		String mensaje) {
}
