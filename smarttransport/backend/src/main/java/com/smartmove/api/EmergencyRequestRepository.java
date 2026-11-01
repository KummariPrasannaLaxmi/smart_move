package com.smartmove.api;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmergencyRequestRepository extends JpaRepository<EmergencyRequest, Long> {
    List<EmergencyRequest> findAllByOrderByCreatedAtDesc();
    List<EmergencyRequest> findAllByUserEmailOrderByCreatedAtDesc(String userEmail);
}
