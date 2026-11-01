# Smart Transport Automation

Smart Transport Automation is a React web application with a Java Spring Boot API and MySQL database. It brings parking reservations, emergency route priority simulation, road hazard reports, eco-friendly route suggestions and transport analytics into one platform. The project is designed to improve travel efficiency, road safety, emergency response and smarter transportation decisions. Its future scope includes IoT and Artificial Intelligence integration.

## Requirements

- Node.js 20.19+ and npm
- Java 21 or newer
- Maven 3.6+
- MySQL 8

## Run on Windows

1. Start MySQL and create the database if needed:

   ```sql
   CREATE DATABASE smartmove CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. From the project root, start the backend. PowerShell prompts securely for the MySQL password:

   ```powershell
   $env:MYSQL_USER = "root"
   $securePassword = Read-Host "MySQL root password" -AsSecureString
   $env:MYSQL_PASSWORD = (New-Object System.Net.NetworkCredential('', $securePassword)).Password
   npm run backend
   ```

3. In a second terminal, install and run the frontend:

   ```powershell
   npm --prefix frontend install
   npm run frontend
   ```

4. Open http://localhost:5173.

Spring Boot creates and updates the MySQL tables on startup. Vite proxies `/api` requests to `http://localhost:8080`.

## Features

- **Smart Parking Reservation:** view availability and reserve a parking space.
- **Emergency Vehicle Priority:** demonstrate an emergency route and simulated signal-priority corridor. It does not control real traffic signals.
- **Road Hazard Reporting:** submit accidents, roadblocks, damaged roads and other hazards; reports are saved in MySQL.
- **Eco-Friendly Route Suggestion:** compare route priorities and open Google Maps for live directions. Live pollution and sensor readings require a data provider.
- **Transport Analytics Dashboard:** review parking utilization, submitted hazards and the current demo traffic status.

## User and admin workspaces

- Public home: `/`; user registration/login: `/register` and `/login`; admin login: `/admin/login`.
- User workspace: dashboard, live map, parking reservation, route planning, hazard reports, reservations, notifications, profile and browser preferences.
- Admin workspace: operations dashboard, parking inventory create/edit/delete, reservation status management, hazard review, user enable/disable, map monitoring, analytics and admin profile/preferences.
- Role is selected during registration/login. Admin registration requires an invite code configured in `SMARTMOVE_ADMIN_SIGNUP_CODE`; leaving it unset disables admin self-registration. Existing admin accounts can sign in at `/admin/login`.
- Admin and user accounts share the same MySQL records. New bookings and hazard reports are associated with their submitting user; admins can view and manage all records. Existing records without an owner remain visible to admins.
- Sign-in returns an opaque session token. Protected API calls send it as a bearer token; logging out or disabling an account revokes that token.
- The first startup seeds four example parking locations if the parking table is empty. These locations are project demo inventory and can be edited in Admin > Parking.
- Reservation and hazard notifications are generated from saved database records. They are not push notifications.
- Ride entries are saved as requests only. There is no connected ride provider or driver dispatch.
- Emergency priority is an educational simulation and never controls actual signals. Traffic intensity is a demo estimate; live traffic, pollution and sensor feeds need provider integrations.

## Configuration

- MySQL connection: `MYSQL_URL`, `MYSQL_USER`, and `MYSQL_PASSWORD` (defaults are in `backend/src/main/resources/application.properties`; set your own local credentials).
- API URL: `frontend/.env.local` may set `VITE_API_BASE_URL`. Leave it blank for the local Vite proxy to Spring Boot at `http://localhost:8080`; set the deployed API origin when hosting separately.
- Admin registration: set `SMARTMOVE_ADMIN_SIGNUP_CODE` in the backend environment and provide that code when creating an admin account.
- Cross-origin frontend origins: configure comma-separated `SMARTMOVE_CORS_ORIGINS` when hosting the frontend separately.

The map uses Google Maps embedded maps and direction links. Maps links provide live Google Maps information; the application does not yet consume Google traffic or pollution APIs.

## API

- Public: `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`.
- Authenticated: `POST /api/auth/logout`, `GET/PUT /api/me`, `GET /api/summary`, `GET /api/parking`, `GET /api/bookings`, `POST /api/bookings`, `PATCH /api/bookings/{id}/status`, `GET/POST /api/reports`, `POST /api/routes`, `GET /api/notifications`.
- Admin role: parking `POST/PUT/DELETE /api/parking/{id}`, hazard `PATCH /api/reports/{id}/status`, user directory `GET /api/admin/users`, and account enable/disable `PATCH /api/admin/users/{id}/enabled`.
- The React API client is `frontend/src/services/api.js`; it reads `VITE_API_BASE_URL` and attaches the session token.
