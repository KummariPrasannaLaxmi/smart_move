package com.smartmove.api;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class RoutePlannerService {
    private final RestClient client = RestClient.builder()
            .defaultHeader("User-Agent", "SmartMoveTransport/1.0 (Smart Transport Automation project)")
            .build();
    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, Point> geocodeCache = new HashMap<>();
    private long lastGeocodeRequest = 0;

    public synchronized RoutePlan findRoutes(String start, String destination, String vehicle) {
        Point from = geocode(start);
        Point to = geocode(destination);
        String coordinates = String.format(Locale.ROOT, "%.6f,%.6f;%.6f,%.6f", from.lon(), from.lat(), to.lon(), to.lat());
        URI routeUri = URI.create("https://router.project-osrm.org/route/v1/driving/" + coordinates
                + "?alternatives=2&overview=full&geometries=geojson");
        JsonNode response;
        try {
            response = client.get().uri(routeUri).retrieve().body(JsonNode.class);
        } catch (RuntimeException error) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The route service is unavailable. Please try again.");
        }
        JsonNode routeNodes = response == null ? null : response.path("routes");
        if (routeNodes == null || !routeNodes.isArray() || routeNodes.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No route was found for those locations.");
        }
        List<RouteOption> options = new ArrayList<>();
        for (int index = 0; index < routeNodes.size(); index++) {
            JsonNode node = routeNodes.get(index);
            List<List<Double>> geometry = mapper.convertValue(node.path("geometry").path("coordinates"), new TypeReference<List<List<Double>>>() {});
            options.add(new RouteOption("route-" + (index + 1), index == 0 ? "Recommended route" : "Alternative " + index,
                    node.path("distance").asDouble(), node.path("duration").asDouble(), geometry));
        }
        return new RoutePlan(start, destination, vehicle, from, to, options, "OSRM routing · © OpenStreetMap contributors");
    }

    private synchronized Point geocode(String location) {
        String key = location.trim().toLowerCase(Locale.ROOT);
        Point cached = geocodeCache.get(key);
        if (cached != null) return cached;
        java.util.regex.Matcher coordinates = java.util.regex.Pattern.compile("^\\s*(-?\\d+(?:\\.\\d+)?)\\s*,\\s*(-?\\d+(?:\\.\\d+)?)\\s*$").matcher(location);
        if (coordinates.matches()) {
            double lat = Double.parseDouble(coordinates.group(1));
            double lon = Double.parseDouble(coordinates.group(2));
            if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) return new Point(lon, lat);
        }
        long wait = 1100 - (System.currentTimeMillis() - lastGeocodeRequest);
        if (wait > 0) {
            try { Thread.sleep(wait); }
            catch (InterruptedException error) { Thread.currentThread().interrupt(); throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Route search was interrupted."); }
        }
        lastGeocodeRequest = System.currentTimeMillis();
        URI uri = UriComponentsBuilder.fromUriString("https://nominatim.openstreetmap.org/search")
                .queryParam("format", "jsonv2").queryParam("limit", 1).queryParam("q", location.trim())
                .build().encode().toUri();
        try {
            JsonNode results = client.get().uri(uri).retrieve().body(JsonNode.class);
            if (results == null || !results.isArray() || results.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Could not find “" + location + "”. Try a nearby street, landmark or city.");
            }
            JsonNode first = results.get(0);
            Point point = new Point(first.path("lon").asDouble(), first.path("lat").asDouble());
            geocodeCache.put(key, point);
            return point;
        } catch (ResponseStatusException error) {
            throw error;
        } catch (RuntimeException error) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The location search service is unavailable. Please try again.");
        }
    }

    public record Point(double lon, double lat) {}
    public record RouteOption(String id, String name, double distanceMeters, double durationSeconds, List<List<Double>> geometry) {}
    public record RoutePlan(String start, String destination, String vehicle, Point startPoint, Point endPoint,
                            List<RouteOption> routes, String attribution) {}
}
