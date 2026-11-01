package com.smartmove.api;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {
    List<UserNotification> findAllByUserEmailIgnoreCaseOrderByDateDesc(String userEmail);
    Optional<UserNotification> findByIdAndUserEmailIgnoreCase(Long id, String userEmail);
}
