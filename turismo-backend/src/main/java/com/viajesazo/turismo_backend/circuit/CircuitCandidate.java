package com.viajesazo.turismo_backend.circuit;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoRegistro;

public record CircuitCandidate(
        Long id,
        String name,
        String description,
        TipoRegistro type,
        InteresCategoria category,
        double latitude,
        double longitude,
        List<TimeSlot> slots,
        ProposalDetails details) {

    public record TimeSlot(LocalDate date, LocalTime start, LocalTime end) {
    }

    public record ProposalDetails(
            List<String> images,
            String city,
            String locality,
            String address,
            String venue,
            BigDecimal latitude,
            BigDecimal longitude,
            TipoAcceso accessType,
            BigDecimal price,
            String priceDescription,
            String officialSite,
            Integer durationMinutes) {

        public ProposalDetails {
            images = images == null ? List.of() : List.copyOf(images);
        }

        public static ProposalDetails empty() {
            return new ProposalDetails(List.of(), null, null, null, null, null, null, null, null, null, null, null);
        }
    }
}
