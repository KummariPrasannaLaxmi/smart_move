package com.smartmove.api;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "road_reports")
public class RoadReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(nullable = false, length = 32)
    public String type;
    @Column(nullable = false, length = 240)
    public String location;
    @Column(nullable = false, length = 2000)
    public String description;
    @Lob @Column(name = "photo_data", columnDefinition = "LONGTEXT")
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String photoData;
    @Column(nullable = false, length = 32)
    public String status = "Pending";
    @Column(name = "user_email", length = 190)
    public String userEmail;
    @Column(nullable = false, updatable = false, name = "created_at")
    public Instant createdAt = Instant.now();
    @Column(name = "occurred_at")
    public Instant occurredAt;
    protected RoadReport() {}
    public RoadReport(String type, String location, String description) {
        this.type = type;
        this.location = location;
        this.description = description;
    }
    public RoadReport(String type, String location, String description, String photoData, String userEmail, Instant occurredAt) {
        this(type, location, description);
        this.photoData = photoData;
        this.userEmail = userEmail;
        this.occurredAt = occurredAt == null ? Instant.now() : occurredAt;
    }
}
