package com.smartmove.api;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "parking_payments")
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(name = "booking_id", nullable = false, unique = true)
    public Long bookingId;
    @Column(name = "payment_id", nullable = false, unique = true, length = 32)
    public String paymentId;
    @Column(nullable = false)
    public int amount;
    @Column(name = "payment_method", nullable = false, length = 24)
    public String paymentMethod;
    @Column(nullable = false, length = 24)
    public String status = "Successful";
    @Column(name = "paid_at", nullable = false)
    public Instant paidAt = Instant.now();

    protected Payment() {}
    public Payment(Long bookingId, String paymentId, int amount, String paymentMethod) {
        this.bookingId = bookingId;
        this.paymentId = paymentId;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
    }
}
