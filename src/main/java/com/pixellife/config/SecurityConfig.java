package com.pixellife.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.util.matcher.RequestMatcher;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
                                            @Value("${app.frontend-url}") String frontendUrl) throws Exception {
        RequestMatcher apiRequest = request -> request.getRequestURI().startsWith("/api/");
        RequestMatcher logoutGet = request -> "GET".equals(request.getMethod()) && "/logout".equals(request.getRequestURI());
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/oauth2/**", "/login/**", "/error").permitAll()
                .requestMatchers("/api/billing/polar/webhook").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll())
            .oauth2Login(oauth -> oauth.defaultSuccessUrl(frontendUrl, true))
            .exceptionHandling(errors -> errors.defaultAuthenticationEntryPointFor(
                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                apiRequest))
            .logout(logout -> logout.logoutRequestMatcher(logoutGet).logoutSuccessUrl(frontendUrl).deleteCookies("JSESSIONID"))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers("/api/billing/polar/webhook"))
            .build();
    }
}
