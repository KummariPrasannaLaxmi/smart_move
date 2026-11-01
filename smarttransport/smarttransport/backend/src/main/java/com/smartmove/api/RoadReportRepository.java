package com.smartmove.api;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RoadReportRepository extends JpaRepository<RoadReport, Long> {
    java.util.List<RoadReport> findAllByUserEmailOrderByCreatedAtDesc(String userEmail);
}
