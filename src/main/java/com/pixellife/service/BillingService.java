package com.pixellife.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pixellife.mapper.PixelLifeMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class BillingService {
    private static final Duration WEBHOOK_TOLERANCE = Duration.ofMinutes(5);
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final PixelLifeMapper mapper;
    private final String accessToken;
    private final String productId;
    private final String webhookSecret;
    private final String frontendUrl;

    public BillingService(@Value("${billing.polar.api-base}") String apiBase,
                          @Value("${billing.polar.access-token}") String accessToken,
                          @Value("${billing.polar.plus-product-id}") String productId,
                          @Value("${billing.polar.webhook-secret}") String webhookSecret,
                          @Value("${app.frontend-url}") String frontendUrl,
                          ObjectMapper objectMapper,
                          PixelLifeMapper mapper) {
        this.restClient = RestClient.builder().baseUrl(apiBase).build();
        this.accessToken = accessToken;
        this.productId = productId;
        this.webhookSecret = webhookSecret;
        this.frontendUrl = frontendUrl;
        this.objectMapper = objectMapper;
        this.mapper = mapper;
    }

    public String createPlusCheckout(long userId, String email, String customerIp) {
        if (accessToken.isBlank() || productId.isBlank()) throw new IllegalStateException("Plus checkout is not configured yet");
        Map<String,Object> response = restClient.post()
            .uri("/checkouts/")
            .header("Authorization", "Bearer " + accessToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of(
                "products", List.of(productId),
                "external_customer_id", String.valueOf(userId),
                "customer_email", email,
                "customer_ip_address", customerIp,
                "metadata", Map.of("user_id", String.valueOf(userId)),
                "success_url", frontendUrl + "/?billing=success&checkout_id={CHECKOUT_ID}",
                "return_url", frontendUrl + "/?billing=cancel"))
            .retrieve().body(Map.class);
        Object url = response == null ? null : response.get("url");
        if (url == null || String.valueOf(url).isBlank()) throw new IllegalStateException("Checkout URL was not returned");
        return String.valueOf(url);
    }

    public String createCustomerPortal(long userId) {
        if (accessToken.isBlank()) throw new IllegalStateException("Plus billing is not configured yet");
        String customerId = mapper.findPolarCustomerId(userId);
        Map<String,Object> request = customerId == null || customerId.isBlank()
            ? Map.of("external_customer_id", String.valueOf(userId), "return_url", frontendUrl)
            : Map.of("customer_id", customerId, "return_url", frontendUrl);
        Map<String,Object> response = restClient.post()
            .uri("/customer-sessions/")
            .header("Authorization", "Bearer " + accessToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(request)
            .retrieve().body(Map.class);
        Object url = response == null ? null : response.get("customer_portal_url");
        if (url == null || String.valueOf(url).isBlank()) throw new IllegalStateException("Customer portal URL was not returned");
        return String.valueOf(url);
    }

    @Transactional
    public void handleWebhook(byte[] payload, String webhookId, String timestamp, String signature) {
        verifySignature(payload, webhookId, timestamp, signature, Instant.now());
        try {
            Map<String,Object> event = objectMapper.readValue(payload, new TypeReference<>() {});
            String type = text(event.get("type"));
            LocalDateTime eventTime = utcDateTime(text(event.get("timestamp")));
            if (mapper.claimBillingWebhook(webhookId, type, eventTime) == 0) return;
            if (type.startsWith("subscription.")) processSubscription(type, object(event.get("data")), eventTime);
            mapper.markBillingWebhookProcessed(webhookId);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Invalid Polar webhook payload", exception);
        }
    }

    void verifySignature(byte[] payload, String webhookId, String timestamp, String signature, Instant now) {
        if (webhookSecret.isBlank()) throw new IllegalStateException("Polar webhook is not configured yet");
        if (blank(webhookId) || blank(timestamp) || blank(signature)) throw new SecurityException("Missing Polar webhook signature");
        try {
            Instant sentAt = Instant.ofEpochSecond(Long.parseLong(timestamp));
            if (Duration.between(sentAt, now).abs().compareTo(WEBHOOK_TOLERANCE) > 0) throw new SecurityException("Expired Polar webhook signature");
            byte[] signed = (webhookId + "." + timestamp + "." + new String(payload, StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8);
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = mac.doFinal(signed);
            for (String candidate : signature.trim().split("\\s+")) {
                String[] parts = candidate.split(",", 2);
                if (parts.length == 2 && "v1".equals(parts[0]) && MessageDigest.isEqual(expected, Base64.getDecoder().decode(parts[1]))) return;
            }
            throw new SecurityException("Invalid Polar webhook signature");
        } catch (SecurityException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new SecurityException("Invalid Polar webhook signature", exception);
        }
    }

    private void processSubscription(String eventType, Map<String,Object> data, LocalDateTime eventTime) {
        if (!productId.equals(text(data.get("product_id")))) return;
        Long userId = externalUserId(data);
        if (userId == null) throw new IllegalArgumentException("Polar customer has no PixelLife user ID");
        String customerId = text(data.get("customer_id"));
        String subscriptionId = text(data.get("id"));
        String status = text(data.get("status"));
        if ("subscription.revoked".equals(eventType) || "canceled".equals(status) || "unpaid".equals(status)) {
            mapper.revokePolarSubscription(userId, customerId, subscriptionId, eventTime);
        } else if ("active".equals(status) || "trialing".equals(status) || "past_due".equals(status)) {
            LocalDateTime paidUntil = firstDate(data.get("current_period_end"), data.get("ends_at"), data.get("trial_end"));
            if (paidUntil == null) throw new IllegalArgumentException("Polar subscription has no period end");
            mapper.activatePolarSubscription(userId, customerId, subscriptionId, paidUntil, eventTime);
        }
    }

    private Long externalUserId(Map<String,Object> data) {
        String value = text(object(data.get("customer")).get("external_id"));
        if (blank(value)) value = text(object(data.get("metadata")).get("user_id"));
        try { return blank(value) ? null : Long.valueOf(value); }
        catch (NumberFormatException ignored) { return null; }
    }

    private LocalDateTime firstDate(Object... values) {
        for (Object value : values) if (!blank(text(value))) return utcDateTime(text(value));
        return null;
    }

    private LocalDateTime utcDateTime(String value) { return OffsetDateTime.parse(value).withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime(); }
    @SuppressWarnings("unchecked") private Map<String,Object> object(Object value) { return value instanceof Map<?,?> ? (Map<String,Object>) value : Map.of(); }
    private String text(Object value) { return value == null ? "" : String.valueOf(value); }
    private boolean blank(String value) { return value == null || value.isBlank(); }
}
