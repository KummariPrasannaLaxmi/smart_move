package com.smartmove.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {
    public static final String USER_ATTRIBUTE = "smartmove.user";
    private final AppUserRepository users;
    public AuthInterceptor(AppUserRepository users) { this.users = users; }

    @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        String path = request.getRequestURI();
        if (path.equals("/api/health") || path.equals("/api/auth/login") || path.equals("/api/auth/register")) return true;
        String header = request.getHeader("Authorization");
        String token = header != null && header.startsWith("Bearer ") ? header.substring(7) : "";
        AppUser user = token.isBlank() ? null : users.findBySessionToken(token).orElse(null);
        if (user == null || !user.enabled) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Please sign in to continue.\"}");
            return false;
        }
        request.setAttribute(USER_ATTRIBUTE, user);
        return true;
    }
}
