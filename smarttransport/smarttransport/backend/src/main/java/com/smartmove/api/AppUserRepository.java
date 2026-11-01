package com.smartmove.api;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmailIgnoreCase(String email);
    Optional<AppUser> findByPhone(String phone);
    Optional<AppUser> findBySessionToken(String sessionToken);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByPhone(String phone);
}
