package com.viajesazo.turismo_backend.dto.response;

import java.util.List;

public record AlternativasReemplazoResponse(
        List<AlternativaReemplazoResponse> alternativas,
        String mensaje) {
}
