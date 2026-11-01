package com.smartmove.api;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class ParkingLocationSeeder implements CommandLineRunner {
    private final ParkingLocationRepository parking;
    public ParkingLocationSeeder(ParkingLocationRepository parking) { this.parking = parking; }
    @Override public void run(String... args) {
        add("City Mall Parking", "Miyapur, Hyderabad", "0.4 km", 80, 24, 40, "Malls", "9:00 AM – 11:00 PM");
        add("Central Mall Parking", "Secunderabad, Hyderabad", "0.8 km", 60, 12, 30, "Malls", "10:00 AM – 10:00 PM");
        add("Secunderabad Railway Parking", "Secunderabad Railway Station", "1.2 km", 120, 36, 25, "Railway Stations", "Open 24 hours");
        add("Hitech City Mall Parking", "Hitech City, Hyderabad", "2.5 km", 45, 8, 50, "Shopping Areas", "9:00 AM – 11:00 PM");
        add("Prasads Cinema Parking", "Necklace Road, Hyderabad", "3.1 km", 90, 27, 35, "Cinemas", "9:00 AM – 1:00 AM");
        add("Care Hospital Parking", "Banjara Hills, Hyderabad", "4.2 km", 110, 42, 20, "Hospitals", "Open 24 hours");
        add("Airport Terminal Parking", "Rajiv Gandhi International Airport", "25 km", 300, 74, 60, "Airports", "Open 24 hours");
        add("Inorbit Shopping Complex", "Madhapur, Hyderabad", "2.1 km", 140, 51, 40, "Shopping Areas", "10:00 AM – 10:00 PM");
        add("Cyber Towers Visitor Parking", "Madhapur, Hyderabad", "1.8 km", 100, 33, 30, "Other", "7:00 AM – 11:00 PM");
    }
    private void add(String name, String address, String distance, int total, int available, int price, String category, String hours) {
        ParkingLocation existing = parking.findAll().stream().filter(item -> item.name.equalsIgnoreCase(name)).findFirst().orElse(null);
        if (existing != null) {
            if (existing.category == null || existing.category.isBlank() || "Other".equals(existing.category)) existing.category = category;
            if (existing.openingHours == null || existing.openingHours.isBlank()) existing.openingHours = hours;
            parking.save(existing);
            return;
        }
        parking.save(new ParkingLocation(name, address, distance, total, available, price, "Open", category, hours));
    }
}
