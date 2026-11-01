package com.smartmove.api;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    java.util.List<Booking> findAllByOrderByDateDesc();
    java.util.List<Booking> findAllByUserEmailOrderByDateDesc(String userEmail);
    boolean existsByParkingLocationIdAndParkingSlotAndStatus(Long parkingLocationId, String parkingSlot, String status);
    @Query("select count(b) > 0 from Booking b where b.id <> :excludeId and b.parkingLocationId = :locationId and b.parkingSlot = :slot and (b.status = 'Confirmed' or (b.status = 'Pending Payment' and b.date > :cutoff)) and b.startTime < :end and b.endTime > :start")
    boolean hasOverlappingBooking(@Param("excludeId") Long excludeId, @Param("locationId") Long locationId, @Param("slot") String slot, @Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end, @Param("cutoff") java.time.Instant cutoff);
}
