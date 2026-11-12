package com.viajesazo.turismo_backend.model;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum EstadoViaje {
    BORRADOR, PLANIFICADO, EN_CURSO, CANCELADO, FINALIZADO;

    private static final Map<EstadoViaje, Set<EstadoViaje>> PERMITIDAS = new EnumMap<>(EstadoViaje.class);

    static {
        PERMITIDAS.put(BORRADOR, EnumSet.of(PLANIFICADO, CANCELADO));
        PERMITIDAS.put(PLANIFICADO, EnumSet.of(EN_CURSO, CANCELADO));
        PERMITIDAS.put(EN_CURSO, EnumSet.of(FINALIZADO));
        PERMITIDAS.put(CANCELADO, EnumSet.noneOf(EstadoViaje.class));
        PERMITIDAS.put(FINALIZADO, EnumSet.noneOf(EstadoViaje.class));
    }

    public boolean puedeTransicionarA(EstadoViaje destino) {
        return destino != null && PERMITIDAS.get(this).contains(destino);
    }

    public boolean esTerminal() {
        return PERMITIDAS.get(this).isEmpty();
    }
}
