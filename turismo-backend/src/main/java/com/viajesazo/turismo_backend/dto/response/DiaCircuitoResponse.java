package com.viajesazo.turismo_backend.dto.response;

import java.time.LocalDate;
import java.util.List;

public record DiaCircuitoResponse(
        LocalDate fecha,
        List<AlternativaItemResponse> items) {
}
