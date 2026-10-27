package com.viajesazo.turismo_backend.circuit;

import java.util.List;
import java.util.Set;

import com.viajesazo.turismo_backend.model.InteresCategoria;

public record GeneratedAlternative(
        CircuitStrategy strategy,
        List<ScheduledProposal> proposals,
        double totalDistanceKm,
        double interestAffinity,
        Set<InteresCategoria> categoriesCovered,
        String warning) {
}
