package com.smartmove.api;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "bookings")
public class Booking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(nullable = false, length = 160)
    public String service;
    @Column(nullable = false, length = 240)
    public String route;
    @Column(nullable = false)
    public int price;
    @Column(nullable = false, length = 32)
    public String status;
    @Column(name = "user_email", length = 190)
    public String userEmail;
    @Column(name = "parking_location_id")
    public Long parkingLocationId;
    @Column(name = "parking_slot", length = 12)
    public String parkingSlot;
    @Column(length = 16)
    public String vehicle;
    @Column(name = "duration_hours")
    public Integer durationHours;
    @Column(name = "reservation_id", unique = true, length = 40)
    public String reservationId;
    @Column(name = "vehicle_number", length = 16)
    public String vehicleNumber;
    @Column(name = "owner_name", length = 120)
    public String ownerName;
    @Column(name = "start_time")
    public java.time.LocalDateTime startTime;
    @Column(name = "end_time")
    public java.time.LocalDateTime endTime;
    @Column(name = "payment_status", length = 24)
    public String paymentStatus = "Unpaid";
    @Column(name = "payment_reference", length = 32)
    public String paymentReference;
    @Column(nullable = false, updatable = false, name = "created_at")
    public Instant date = Instant.now();
    protected Booking() {}
    public Booking(String service, String route, int price, String userEmail, Long parkingLocationId) {
        this(service, route, price, userEmail, parkingLocationId, null, null, null);
    }
    public Booking(String service, String route, int price, String userEmail, Long parkingLocationId, String parkingSlot, String vehicle, Integer durationHours) {
        this.service = service;
        this.route = route;
        this.price = price;
        this.status = "Confirmed";
        this.userEmail = userEmail;
        this.parkingLocationId = parkingLocationId;
        this.parkingSlot = parkingSlot;
        this.vehicle = vehicle;
        this.durationHours = durationHours;
        this.reservationId = "SM-CP-" + java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE) + "-" + java.util.UUID.randomUUID().toString().substring(0, 5).toUpperCase();
    }
}
