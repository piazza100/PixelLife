package com.pixellife.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ApiRateLimitFilter extends OncePerRequestFilter {
    private final int requestsPerMinute;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public ApiRateLimitFilter(@Value("${app.rate-limit.requests-per-minute:120}") int requestsPerMinute) {
        this.requestsPerMinute = Math.max(30, requestsPerMinute);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api/") || path.equals("/api/billing/polar/webhook");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
        long minute = Instant.now().getEpochSecond() / 60;
        String key = request.getRemoteAddr() + ':' + minute;
        Window window = windows.compute(key, (ignored, current) -> current == null ? new Window(minute, 1) : current.next());
        if (window.count() > requestsPerMinute) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"code\":\"RATE_LIMITED\",\"message\":\"Too many requests. Please wait a minute.\"}");
            return;
        }
        if (windows.size() > 2_000) windows.keySet().removeIf(existing -> !existing.endsWith(":" + minute));
        chain.doFilter(request, response);
    }

    private record Window(long minute, int count) { Window next() { return new Window(minute, count + 1); } }
}
