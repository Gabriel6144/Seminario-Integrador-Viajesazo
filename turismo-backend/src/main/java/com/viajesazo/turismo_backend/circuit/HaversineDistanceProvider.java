package com.viajesazo.turismo_backend.circuit;

import org.springframework.stereotype.Component;

@Component
public class HaversineDistanceProvider implements DistanceProvider {

    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double AVERAGE_SPEED_KM_H = 30.0;

    @Override
    public TravelEstimate estimate(double fromLatitude, double fromLongitude,
            double toLatitude, double toLongitude) {
        double latitudeDistance = Math.toRadians(toLatitude - fromLatitude);
        double longitudeDistance = Math.toRadians(toLongitude - fromLongitude);
        double fromLatitudeRadians = Math.toRadians(fromLatitude);
        double toLatitudeRadians = Math.toRadians(toLatitude);
        double haversine = Math.pow(Math.sin(latitudeDistance / 2), 2)
                + Math.cos(fromLatitudeRadians) * Math.cos(toLatitudeRadians)
                        * Math.pow(Math.sin(longitudeDistance / 2), 2);
        double distance = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
        int minutes = (int) Math.ceil(distance / AVERAGE_SPEED_KM_H * 60);
        return new TravelEstimate(distance, minutes);
    }

    @Override
    public boolean estimated() {
        return true;
    }
}
