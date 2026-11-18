package com.viajesazo.turismo_backend.circuit;

/** Cupos diarios de eventos y actividades para ritmo {@code MANUAL}. */
public record DayQuota(int events, int activities) {

	public int total() {
		return Math.max(0, events) + Math.max(0, activities);
	}
}
