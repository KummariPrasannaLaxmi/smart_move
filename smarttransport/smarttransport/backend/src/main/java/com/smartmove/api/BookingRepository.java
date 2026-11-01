package com.smartmove.api;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    java.util.List<Booking> findAllByOrderByDateDesc();
    java.util.List<Booking> findAllByUserEmailOrderByDateDesc(String userEmail);
    boolean existsByParkingLocationIdAndParkingSlotAndStatus(Long parkingLocationId, String parkingSlot, String status);
}
