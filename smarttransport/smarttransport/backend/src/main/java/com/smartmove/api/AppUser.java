package com.smartmove.api;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "app_users")
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(nullable = false, length = 120)
    public String name;
    @Column(nullable = false, unique = true, length = 190)
    public String email;
    @Column(unique = true, length = 24)
    public String phone;
    @Column(nullable = false, name = "password_hash", length = 100)
    public String passwordHash;
    @Column(nullable = false, length = 16, columnDefinition = "varchar(16) default 'USER'")
    public String role = "USER";
    @Column(name = "session_token", length = 36)
    public String sessionToken;
    @Column(nullable = false, columnDefinition = "boolean default true")
    public boolean enabled = true;
    @Column(nullable = false, updatable = false, name = "created_at")
    public Instant createdAt = Instant.now();
    protected AppUser() {}
    public AppUser(String name, String email, String passwordHash) {
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
    }
    public AppUser(String name, String email, String phone, String passwordHash) {
        this(name, email, passwordHash);
        this.phone = phone;
    }
    public AppUser(String name, String email, String phone, String passwordHash, String role) {
        this(name, email, phone, passwordHash);
        this.role = role;
    }
}
