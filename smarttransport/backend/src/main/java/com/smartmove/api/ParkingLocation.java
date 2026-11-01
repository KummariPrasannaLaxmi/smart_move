package com.smartmove.api;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "parking_locations")
public class ParkingLocation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(nullable = false, length = 120)
    public String name;
    @Column(nullable = false, length = 240)
    public String address;
    @Column(length = 64)
    public String distance;
    @Column(nullable = false)
    public int total;
    @Column(nullable = false)
    public int available;
    @Column(nullable = false)
    public int price;
    @Column(nullable = false, length = 24)
    public String status = "Open";
    @Column(length = 32)
    public String category = "Other";
    @Column(name = "opening_hours", length = 48)
    public String openingHours = "6:00 AM – 11:00 PM";
    protected ParkingLocation() {}
    public ParkingLocation(String name, String address, String distance, int total, int available, int price, String status) {
        this.name = name;
        this.address = address;
        this.distance = distance;
        this.total = total;
        this.available = available;
        this.price = price;
        this.status = status;
    }
    public ParkingLocation(String name, String address, String distance, int total, int available, int price, String status, String category, String openingHours) {
        this(name, address, distance, total, available, price, status);
        this.category = category;
        this.openingHours = openingHours;
    }
}
