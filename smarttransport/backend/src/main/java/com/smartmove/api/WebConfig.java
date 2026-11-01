package com.smartmove.api;

import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final AuthInterceptor authInterceptor;
    @Value("${smartmove.cors-origins:http://localhost:5173,http://127.0.0.1:5173}") private String corsOrigins;
    public WebConfig(AuthInterceptor authInterceptor) { this.authInterceptor = authInterceptor; }
    @Override public void addInterceptors(InterceptorRegistry registry) { registry.addInterceptor(authInterceptor).addPathPatterns("/api/**"); }
    @Override public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**").allowedOrigins(corsOrigins.split(",")).allowedMethods("GET","POST","PUT","PATCH","DELETE","OPTIONS").allowedHeaders("Authorization","Content-Type");
    }
}
