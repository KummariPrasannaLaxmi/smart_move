package com.smartmove.api;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "emergency_requests")
public class EmergencyRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(nullable = false, length = 32)
    public String type;
    @Column(nullable = false, length = 240)
    public String location;
    @Column(nullable = false, length = 2000)
    public String description;
    @Column(nullable = false, length = 32)
    public String status = "Pending";
    @Column(name = "user_email", length = 190)
    public String userEmail;
    @Column(nullable = false, updatable = false, name = "created_at")
    public Instant createdAt = Instant.now();

    protected EmergencyRequest() {}
    public EmergencyRequest(String type, String location, String description, String userEmail) {
        this.type = type;
        this.location = location;
        this.description = description;
        this.userEmail = userEmail;
    }
}
