package com.smartmove.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class SmartMoveController {
    private final AppUserRepository users;
    private final BookingRepository bookings;
    private final RoadReportRepository reports;
    private final RoutePlannerService routePlanner;
    private final ParkingLocationRepository parking;
    private final EmergencyRequestRepository emergencyRequests;
    private final PaymentRepository payments;
    private final UserNotificationRepository notifications;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();
    @Value("${smartmove.admin-signup-code:}") private String adminSignupCode;

    public SmartMoveController(AppUserRepository users, BookingRepository bookings, RoadReportRepository reports, RoutePlannerService routePlanner, ParkingLocationRepository parking, EmergencyRequestRepository emergencyRequests, PaymentRepository payments, UserNotificationRepository notifications) {
        this.users = users;
        this.bookings = bookings;
        this.reports = reports;
        this.routePlanner = routePlanner;
        this.parking = parking;
        this.emergencyRequests = emergencyRequests;
        this.payments = payments;
        this.notifications = notifications;
    }

    @GetMapping("/health")
    public Map<String, Object> health() { return Map.of("ok", true, "service", "Smart Transport Automation API"); }

    @GetMapping("/summary")
    public Map<String, Object> summary(HttpServletRequest request) {
        AppUser user = currentUser(request);
        boolean admin = "ADMIN".equals(normalizeRole(user.role));
        List<RoadReport> visibleReports = admin ? reports.findAll() : reports.findAllByUserEmailOrderByCreatedAtDesc(user.email);
        List<Booking> visibleBookings = admin ? bookings.findAll() : bookings.findAllByUserEmailOrderByDateDesc(user.email);
        long pendingHazards = visibleReports.stream().filter(r -> "Pending".equals(r.status)).count();
        return Map.of("parking", parking.findAll().stream().mapToInt(p -> p.available).sum(),
                "parkingTotal", parking.findAll().stream().mapToInt(p -> p.total).sum(), "reports", visibleReports.size(), "users", admin ? users.count() : 1,
                "hazards", pendingHazards, "traffic", "Unavailable", "bookings", visibleBookings.size());
    }

    @GetMapping("/parking")
    public List<ParkingView> parking() { return parking.findAll().stream().map(SmartMoveController::parkingView).toList(); }

    @GetMapping("/admin/dashboard")
    public Map<String, Object> adminDashboard(HttpServletRequest context) {
        requireAdmin(context);
        List<ParkingLocation> locations = parking.findAll();
        List<Booking> allBookings = bookings.findAllByOrderByDateDesc();
        List<RoadReport> allReports = reports.findAll();
        List<EmergencyRequest> allEmergencyRequests = emergencyRequests.findAllByOrderByCreatedAtDesc();
        return Map.of(
                "totalUsers", users.count(),
                "activeParkingReservations", allBookings.stream().filter(b -> "Confirmed".equalsIgnoreCase(b.status) && b.parkingLocationId != null).count(),
                "pendingHazardReports", allReports.stream().filter(r -> "Pending".equalsIgnoreCase(r.status)).count(),
                "emergencyRequests", allEmergencyRequests.stream().filter(r -> "Pending".equalsIgnoreCase(r.status) || "In Progress".equalsIgnoreCase(r.status)).count(),
                "totalBookings", allBookings.size(),
                "availableParkingLocations", locations.stream().filter(p -> p.available > 0 && "Open".equalsIgnoreCase(p.status)).count(),
                "bookings", allBookings.stream().limit(5).toList(),
                "reports", allReports.stream().sorted(Comparator.comparing((RoadReport r) -> r.createdAt, Comparator.nullsLast(Comparator.reverseOrder()))).limit(5).toList(),
                "emergencies", allEmergencyRequests.stream().limit(5).toList(),
                "parking", locations);
    }

    @GetMapping("/emergency-requests")
    public List<EmergencyRequest> emergencyRequests(HttpServletRequest context) {
        AppUser user = currentUser(context);
        return "ADMIN".equals(normalizeRole(user.role)) ? emergencyRequests.findAllByOrderByCreatedAtDesc() : emergencyRequests.findAllByUserEmailOrderByCreatedAtDesc(user.email);
    }

    @PostMapping("/emergency-requests")
    public ResponseEntity<EmergencyRequest> createEmergencyRequest(@Valid @RequestBody EmergencyRequestBody request, HttpServletRequest context) {
        EmergencyRequest saved = emergencyRequests.save(new EmergencyRequest(request.type().trim(), request.location().trim(), request.description().trim(), currentUser(context).email));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PatchMapping("/emergency-requests/{id}/status")
    public EmergencyRequest updateEmergencyRequestStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest request, HttpServletRequest context) {
        requireAdmin(context);
        EmergencyRequest item = emergencyRequests.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Emergency request was not found."));
        String status = request.status().trim();
        if (!List.of("Pending", "In Progress", "Resolved", "Rejected").contains(status)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported emergency request status.");
        String oldStatus = item.status;
        item.status = status;
        EmergencyRequest saved = emergencyRequests.save(item);
        if (!status.equalsIgnoreCase(oldStatus) && item.userEmail != null) notifications.save(new UserNotification(item.userEmail, "Emergency request " + status.toLowerCase(), item.type + " · " + item.location + " · Status changed from " + oldStatus + " to " + status + "."));
        return saved;
    }

    @PostMapping("/parking")
    public ResponseEntity<?> addParking(@Valid @RequestBody ParkingRequest request, HttpServletRequest context) {
        requireAdmin(context);
        validateParkingCapacity(request);
        ParkingLocation saved = parking.save(new ParkingLocation(request.name().trim(), request.address().trim(), request.distance(), request.total(), request.available(), request.price(), request.status(), defaultValue(request.category(), "Other"), defaultValue(request.openingHours(), "6:00 AM – 11:00 PM")));
        return ResponseEntity.status(HttpStatus.CREATED).body(parkingView(saved));
    }

    @PutMapping("/parking/{id}")
    public ParkingView updateParking(@PathVariable Long id, @Valid @RequestBody ParkingRequest request, HttpServletRequest context) {
        requireAdmin(context);
        validateParkingCapacity(request);
        ParkingLocation spot = parking.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parking location was not found."));
        spot.name = request.name().trim(); spot.address = request.address().trim(); spot.distance = request.distance();
        spot.total = request.total(); spot.available = request.available(); spot.price = request.price(); spot.status = request.status(); spot.category = defaultValue(request.category(), "Other"); spot.openingHours = defaultValue(request.openingHours(), "6:00 AM – 11:00 PM");
        return parkingView(parking.save(spot));
    }

    @DeleteMapping("/parking/{id}")
    public ResponseEntity<?> deleteParking(@PathVariable Long id, HttpServletRequest context) {
        requireAdmin(context);
        if (!parking.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Parking location was not found.");
        parking.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/bookings")
    public List<Booking> bookings(HttpServletRequest request) {
        AppUser user = currentUser(request);
        return "ADMIN".equals(normalizeRole(user.role)) ? bookings.findAllByOrderByDateDesc() : bookings.findAllByUserEmailOrderByDateDesc(user.email);
    }

    @Transactional
    @DeleteMapping("/bookings/{id}")
    public ResponseEntity<?> deleteBooking(@PathVariable Long id, HttpServletRequest context) {
        AppUser user = currentUser(context);
        Booking booking = bookings.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation was not found."));
        if (booking.userEmail == null || !user.email.equalsIgnoreCase(booking.userEmail)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation was not found.");
        }
        if (booking.parkingLocationId != null && "Confirmed".equals(booking.status)) {
            parking.findByIdForUpdate(booking.parkingLocationId).ifPresent(spot -> {
                spot.available = Math.min(spot.total, spot.available + 1);
                if (spot.available > 0 && "Full".equalsIgnoreCase(spot.status)) spot.status = "Open";
                parking.save(spot);
            });
        }
        bookings.delete(booking);
        return ResponseEntity.noContent().build();
    }

    @Transactional
    @PatchMapping("/bookings/{id}/status")
    public Booking updateBookingStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest request, HttpServletRequest context) {
        Booking booking = bookings.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation was not found."));
        AppUser user = currentUser(context);
        String status = request.status().trim();
        if ("ADMIN".equals(normalizeRole(user.role))) {
            if (!List.of("Confirmed", "Cancelled", "Completed").contains(status)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported reservation status.");
            if (booking.parkingLocationId != null && "Pending Payment".equals(booking.status) && "Confirmed".equals(status) && !"Paid".equalsIgnoreCase(booking.paymentStatus)) throw new ResponseStatusException(HttpStatus.CONFLICT, "A parking reservation can only be confirmed after successful payment.");
        } else {
        if (!user.email.equalsIgnoreCase(booking.userEmail) || !"Cancelled".equals(status) || !List.of("Confirmed", "Pending Payment").contains(booking.status))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only cancel your own active reservation.");
        }
        String oldStatus = booking.status;
        if (booking.parkingLocationId != null && !"Confirmed".equals(oldStatus) && "Confirmed".equals(status)) {
            ParkingLocation spot = parking.findById(booking.parkingLocationId).orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "The parking location for this reservation no longer exists."));
            if (spot.available < 1 || !"Open".equalsIgnoreCase(spot.status)) throw new ResponseStatusException(HttpStatus.CONFLICT, "There are no available spaces to restore this reservation.");
            spot.available--;
            if (spot.available == 0) spot.status = "Full";
            parking.save(spot);
        }
        booking.status = status;
        Booking updated = bookings.save(booking);
        if ("ADMIN".equals(normalizeRole(user.role)) && !status.equalsIgnoreCase(oldStatus) && booking.userEmail != null) notifications.save(new UserNotification(booking.userEmail, "Reservation " + status.toLowerCase(), booking.service + " · " + booking.route + " · Status changed from " + oldStatus + " to " + status + "."));
        if (booking.parkingLocationId != null && "Confirmed".equals(oldStatus) && "Cancelled".equals(status)) {
            parking.findById(booking.parkingLocationId).ifPresent(spot -> { spot.available = Math.min(spot.total, spot.available + 1); if (spot.available > 0 && "Full".equals(spot.status)) spot.status = "Open"; parking.save(spot); });
        }
        return updated;
    }

    @GetMapping("/reports")
    public List<RoadReport> reports(HttpServletRequest request) {
        AppUser user = currentUser(request);
        return "ADMIN".equals(normalizeRole(user.role)) ? reports.findAll() : reports.findAllByUserEmailOrderByCreatedAtDesc(user.email);
    }

    @Transactional
    @DeleteMapping("/reports/{id}")
    public ResponseEntity<Void> deleteReport(@PathVariable Long id, HttpServletRequest context) {
        AppUser user = currentUser(context);
        RoadReport report = reports.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hazard report was not found."));
        if (report.userEmail == null || !user.email.equalsIgnoreCase(report.userEmail)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Hazard report was not found.");
        reports.delete(report);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/reports/{id}/status")
    public RoadReport updateReportStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest request, HttpServletRequest context) {
        requireAdmin(context);
        RoadReport report = reports.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hazard report was not found."));
        String status = request.status().trim();
        if (!List.of("Pending", "Reviewing", "Resolved", "Rejected").contains(status)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported report status.");
        String oldStatus = report.status;
        report.status = status;
        RoadReport saved = reports.save(report);
        if (!status.equalsIgnoreCase(oldStatus) && report.userEmail != null) notifications.save(new UserNotification(report.userEmail, "Hazard report " + status.toLowerCase(), report.type + " · " + report.location + " · Status changed from " + oldStatus + " to " + status + "."));
        return saved;
    }

    @PostMapping("/routes")
    public RoutePlannerService.RoutePlan routes(@Valid @RequestBody RouteRequest request) {
        return routePlanner.findRoutes(request.start().trim(), request.destination().trim(), request.vehicle());
    }

    @Transactional
    @PostMapping("/bookings")
    public ResponseEntity<Booking> createBooking(@Valid @RequestBody BookingRequest request, HttpServletRequest context) {
        ParkingLocation location = null;
        int reservationPrice = request.price();
        if (request.parkingId() != null) {
            long id;
            try { id = Long.parseLong(request.parkingId().replaceFirst("^p", "")); }
            catch (NumberFormatException error) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid parking location."); }
            location = parking.findByIdForUpdate(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parking location was not found."));
            if (location.available < 1 || "Closed".equalsIgnoreCase(location.status)) throw new ResponseStatusException(HttpStatus.CONFLICT, "This parking location is currently full or closed.");
            if (!validParkingSlot(request.slot(), location.total) || request.durationHours() == null || !List.of(1, 2, 3, 4, 6, 8, 12, 24).contains(request.durationHours()) || !List.of("Car", "Bike", "Auto", "EV Car", "Other").contains(request.vehicle()) || request.vehicleNumber() == null || !request.vehicleNumber().trim().matches("(?i)[A-Z0-9 -]{5,16}") || request.ownerName() == null || request.ownerName().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid slot, vehicle and duration.");
            }
            java.time.LocalDateTime start = request.startTime() == null ? java.time.LocalDateTime.now().withSecond(0).withNano(0) : request.startTime();
            if (start.isBefore(java.time.LocalDateTime.now().minusMinutes(1))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time cannot be in the past.");
            java.time.LocalDateTime end = start.plusHours(request.durationHours());
            if (bookings.hasOverlappingBooking(0L, location.id, request.slot(), start, end, java.time.Instant.now().minusSeconds(900))) throw new ResponseStatusException(HttpStatus.CONFLICT, "That parking slot is booked for part of this time. Choose another slot or time.");
            long totalPrice = (long) location.price * request.durationHours();
            if (totalPrice > Integer.MAX_VALUE) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The reservation total is too high.");
            reservationPrice = (int) totalPrice;
            Booking saved = new Booking(request.service().trim(), defaultValue(request.route(), "Hyderabad"), reservationPrice, currentUser(context).email, location.id, request.slot(), request.vehicle(), request.durationHours());
            saved.status = "Confirmed";
            saved.paymentStatus = "Not Required";
            saved.startTime = start;
            saved.endTime = end;
            saved.vehicleNumber = request.vehicleNumber().trim().toUpperCase();
            saved.ownerName = request.ownerName().trim();
            location.available--;
            if (location.available == 0) location.status = "Full";
            parking.save(location);
            return ResponseEntity.status(HttpStatus.CREATED).body(bookings.save(saved));
        }
        Booking saved = bookings.save(new Booking(request.service().trim(), defaultValue(request.route(), "Hyderabad"), reservationPrice, currentUser(context).email, location == null ? null : location.id, request.slot(), request.vehicle(), request.durationHours()));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @Transactional
    @PostMapping("/payments/demo")
    public Map<String, Object> demoPayment(@Valid @RequestBody DemoPaymentRequest request, HttpServletRequest context) {
        AppUser user = currentUser(context);
        Booking booking = bookings.findById(request.bookingId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation was not found."));
        if (!user.email.equalsIgnoreCase(booking.userEmail) || booking.parkingLocationId == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation was not found.");
        if (!"Pending Payment".equals(booking.status)) throw new ResponseStatusException(HttpStatus.CONFLICT, "This reservation is no longer awaiting payment.");
        ParkingLocation location = parking.findByIdForUpdate(booking.parkingLocationId).orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Parking location no longer exists."));
        if (location.available < 1 || bookings.hasOverlappingBooking(booking.id, location.id, booking.parkingSlot, booking.startTime, booking.endTime, java.time.Instant.now().minusSeconds(900))) throw new ResponseStatusException(HttpStatus.CONFLICT, "This slot or time is no longer available.");
        String method = request.paymentMethod() == null ? "Demo Payment" : request.paymentMethod().trim();
        if (!List.of("UPI", "Debit Card", "Credit Card", "Net Banking", "Demo Payment").contains(method)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid payment method.");
        String paymentId = "PAY-" + java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE) + "-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();
        payments.save(new Payment(booking.id, paymentId, booking.price, method));
        booking.status = "Confirmed";
        booking.paymentStatus = "Paid";
        booking.paymentReference = paymentId;
        booking = bookings.save(booking);
        location.available--;
        if (location.available == 0) location.status = "Full";
        parking.save(location);
        return Map.of("booking", booking, "paymentId", paymentId);
    }

    @PostMapping("/reports")
    public ResponseEntity<RoadReport> createReport(@Valid @RequestBody ReportRequest request, HttpServletRequest context) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reports.save(new RoadReport(
                defaultValue(request.type(), "hazard"), defaultValue(request.location(), "Hyderabad"), request.description().trim(), request.photoData(), currentUser(context).email, request.occurredAt())));
    }

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "An account with that email already exists."));
        }
        String phone = request.phone() == null || request.phone().isBlank() ? null : request.phone().trim();
        if (phone != null && users.existsByPhone(phone)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "An account with that phone number already exists."));
        }
        String role = normalizeRole(request.role());
        if ("ADMIN".equals(role) && (adminSignupCode == null || adminSignupCode.isBlank() || !adminSignupCode.equals(request.adminCode())))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin registration requires the configured admin signup code.");
        AppUser user = users.save(new AppUser(request.name().trim(), email, phone, passwords.encode(request.password()), role));
        String token = issueToken(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse(userView(user), token));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        String identity = request.identifier().trim();
        var account = identity.contains("@") ? users.findByEmailIgnoreCase(identity) : users.findByPhone(identity);
        AppUser user = account
                .filter(saved -> saved.enabled && passwords.matches(request.password(), saved.passwordHash))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect."));
        if (!normalizeRole(user.role).equals(normalizeRole(request.role()))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "This account does not match the selected account type.");
        }
        return ResponseEntity.ok(new AuthResponse(userView(user), issueToken(user)));
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<?> logout(HttpServletRequest context) {
        AppUser user = currentUser(context); user.sessionToken = null; users.save(user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserView profile(HttpServletRequest context) { return userView(currentUser(context)); }

    @Transactional
    @PutMapping("/me")
    public UserView updateProfile(@Valid @RequestBody ProfileRequest request, HttpServletRequest context) {
        AppUser user = currentUser(context);
        String email = request.email().trim().toLowerCase();
        if (!email.equalsIgnoreCase(user.email) && users.existsByEmailIgnoreCase(email)) throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with that email already exists.");
        String phone = request.phone() == null || request.phone().isBlank() ? null : request.phone().trim();
        if (phone != null && phone.length() < 7) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number must contain at least 7 characters.");
        if (phone != null && users.findByPhone(phone).filter(other -> !other.id.equals(user.id)).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT, "That phone number is already in use.");
        String previousEmail = user.email;
        user.name = request.name().trim(); user.email = email; user.phone = phone;
        if (!previousEmail.equalsIgnoreCase(email)) {
            bookings.findAllByUserEmailOrderByDateDesc(previousEmail).forEach(booking -> { booking.userEmail = email; bookings.save(booking); });
            reports.findAllByUserEmailOrderByCreatedAtDesc(previousEmail).forEach(report -> { report.userEmail = email; reports.save(report); });
        }
        return userView(users.save(user));
    }

    @GetMapping("/admin/users")
    public List<UserAdminView> userDirectory(HttpServletRequest context) {
        requireAdmin(context);
        return users.findAll().stream().map(u -> new UserAdminView(u.id, u.name, u.email, u.phone, normalizeRole(u.role), u.enabled, u.createdAt)).toList();
    }

    @PatchMapping("/admin/users/{id}/enabled")
    public UserAdminView setUserEnabled(@PathVariable Long id, @Valid @RequestBody EnabledRequest request, HttpServletRequest context) {
        requireAdmin(context);
        AppUser user = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User was not found."));
        if (user.id.equals(currentUser(context).id)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot disable your own admin account.");
        user.enabled = request.enabled();
        if (!user.enabled) user.sessionToken = null;
        AppUser saved = users.save(user);
        return new UserAdminView(saved.id, saved.name, saved.email, saved.phone, normalizeRole(saved.role), saved.enabled, saved.createdAt);
    }

    @PatchMapping("/admin/users/{id}/role")
    public UserAdminView setUserRole(@PathVariable Long id, @Valid @RequestBody RoleRequest request, HttpServletRequest context) {
        requireAdmin(context);
        AppUser actor = currentUser(context);
        if (actor.id.equals(id)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot change your own admin role.");
        String role = normalizeRole(request.role());
        if (!List.of("USER", "ADMIN").contains(role)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role must be USER or ADMIN.");
        AppUser target = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User was not found."));
        target.role = role;
        target.sessionToken = null;
        AppUser saved = users.save(target);
        return new UserAdminView(saved.id, saved.name, saved.email, saved.phone, normalizeRole(saved.role), saved.enabled, saved.createdAt);
    }

    @GetMapping("/notifications")
    public List<NotificationView> notifications(HttpServletRequest context) {
        AppUser user = currentUser(context);
        return notifications.findAllByUserEmailIgnoreCaseOrderByDateDesc(user.email).stream().map(n -> new NotificationView(n.id, n.title, n.detail, n.date, n.read)).toList();
    }

    @PatchMapping("/notifications/read")
    public ResponseEntity<Void> markNotificationsRead(HttpServletRequest context) {
        AppUser user = currentUser(context);
        List<UserNotification> items = notifications.findAllByUserEmailIgnoreCaseOrderByDateDesc(user.email);
        items.forEach(item -> item.read = true);
        notifications.saveAll(items);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/notifications/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id, HttpServletRequest context) {
        AppUser user = currentUser(context);
        notifications.findByIdAndUserEmailIgnoreCase(id, user.email).ifPresent(notifications::delete);
        return ResponseEntity.noContent().build();
    }

    private String issueToken(AppUser user) {
        user.sessionToken = UUID.randomUUID().toString();
        users.save(user);
        return user.sessionToken;
    }
    private static AppUser currentUser(HttpServletRequest request) { return (AppUser) request.getAttribute(AuthInterceptor.USER_ATTRIBUTE); }
    private static void requireAdmin(HttpServletRequest request) {
        if (!"ADMIN".equals(normalizeRole(currentUser(request).role))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access is required for this action.");
    }
    private static ParkingView parkingView(ParkingLocation p) { return new ParkingView("p" + p.id, p.name, p.address, p.distance == null ? "" : p.distance, p.available, p.total, p.price, p.status, p.category, p.openingHours); }
    private static void validateParkingCapacity(ParkingRequest request) {
        if (request.available() > request.total()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Available spaces cannot exceed total spaces.");
    }
    private static boolean validParkingSlot(String slot, int total) {
        if (slot == null || !slot.matches("[A-Z]+-\\d{2}")) return false;
        String[] parts = slot.split("-");
        int row = 0;
        for (char letter : parts[0].toCharArray()) row = row * 26 + letter - 'A' + 1;
        int column = Integer.parseInt(parts[1]);
        long index = ((long) row - 1) * 10 + column - 1;
        return column >= 1 && column <= 10 && index < total;
    }

    private static String normalizeRole(String role) {
        String normalized = role == null || role.isBlank() ? "USER" : role.trim().toUpperCase();
        if (!normalized.equals("USER") && !normalized.equals("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose User or Admin account type.");
        }
        return normalized;
    }
    private static UserView userView(AppUser user) { return new UserView(user.name, user.email, user.phone, normalizeRole(user.role)); }
    private static String defaultValue(String value, String fallback) { return value == null || value.isBlank() ? fallback : value.trim(); }

    public record UserView(String name, String email, String phone, String role) {}
    public record UserAdminView(Long id, String name, String email, String phone, String role, boolean enabled, java.time.Instant createdAt) {}
    public record NotificationView(Long id, String title, String detail, java.time.Instant date, boolean read) {}
    public record EmergencyRequestBody(@NotBlank @Size(max = 32) String type, @NotBlank @Size(max = 240) String location, @NotBlank @Size(max = 2000) String description) {}
    public record AuthResponse(UserView user, String token) {}
    public record RegisterRequest(@NotBlank @Size(max = 120) String name, @NotBlank @Email @Size(max = 190) String email,
                                  @Size(min = 7, max = 24) String phone,
                                  @NotBlank @Size(min = 6, max = 100) String password, String role, String adminCode) {}
    public record LoginRequest(@NotBlank String identifier, @NotBlank String password, String role) {}
    public record ProfileRequest(@NotBlank @Size(max = 120) String name, @NotBlank @Email @Size(max = 190) String email, @Size(max = 24) String phone) {}
    public record EnabledRequest(boolean enabled) {}
    public record RoleRequest(@NotBlank String role) {}
    public record StatusRequest(@NotBlank String status) {}
    public record ParkingRequest(@NotBlank @Size(max = 120) String name, @NotBlank @Size(max = 240) String address, String distance,
                                 @jakarta.validation.constraints.Positive int total, @jakarta.validation.constraints.PositiveOrZero int available,
                                 @jakarta.validation.constraints.PositiveOrZero int price, @NotBlank String status, String category, String openingHours) {}
    public record ParkingView(String id, String name, String address, String distance, int available, int total, int price, String status, String category, String openingHours) {}
    public record BookingRequest(@NotBlank @Size(max = 160) String service, @Size(max = 240) String route,
                                 @jakarta.validation.constraints.PositiveOrZero int price, String parkingId,
                                 String slot, String vehicle, Integer durationHours, String vehicleNumber, String ownerName,
                                 java.time.LocalDateTime startTime) {}
    public record DemoPaymentRequest(@jakarta.validation.constraints.Positive long bookingId, String paymentMethod) {}
    public record ReportRequest(@Size(max = 32) String type, @Size(max = 240) String location,
                                @NotBlank @Size(max = 2000) String description, @Size(max = 5_000_000) String photoData, java.time.Instant occurredAt) {}
    public record RouteRequest(@NotBlank @Size(max = 240) String start, @NotBlank @Size(max = 240) String destination,
                               @NotBlank @jakarta.validation.constraints.Pattern(regexp = "(?i)bike|car|auto") String vehicle) {}
}
