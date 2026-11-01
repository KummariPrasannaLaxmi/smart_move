package com.smartmove.api;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "user_notifications")
public class UserNotification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, length = 190) public String userEmail;
    @Column(nullable = false, length = 120) public String title;
    @Column(nullable = false, length = 500) public String detail;
    @Column(nullable = false) public boolean read = false;
    @Column(nullable = false, updatable = false) public Instant date = Instant.now();
    protected UserNotification() {}
    public UserNotification(String userEmail, String title, String detail) { this.userEmail = userEmail; this.title = title; this.detail = detail; }
}
