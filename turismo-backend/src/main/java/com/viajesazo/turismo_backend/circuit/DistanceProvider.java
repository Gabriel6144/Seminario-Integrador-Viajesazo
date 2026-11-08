package com.viajesazo.turismo_backend.circuit;

public interface DistanceProvider {
    TravelEstimate estimate(double fromLatitude, double fromLongitude,
            double toLatitude, double toLongitude);

    boolean estimated();
}
