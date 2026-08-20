package com.pixellife.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pixellife.mapper.PixelLifeMapper;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BillingServiceTest {
    private static final String SECRET = "test-secret";
    private static final String PRODUCT = "plus-product";
    private final PixelLifeMapper mapper = mock(PixelLifeMapper.class);
    private final BillingService billing = new BillingService(
        "https://sandbox-api.polar.sh/v1", "token", PRODUCT, SECRET, "http://localhost:5173",
        new ObjectMapper().findAndRegisterModules(), mapper);

    @Test
    void activatesPlusFromSignedActiveSubscription() throws Exception {
        Instant now = Instant.now();
        byte[] payload = payload("subscription.active", "active", now);
        String webhookId = "evt_active";
        String timestamp = String.valueOf(now.getEpochSecond());
        when(mapper.claimBillingWebhook(eq(webhookId), eq("subscription.active"), any())).thenReturn(1);

        billing.handleWebhook(payload, webhookId, timestamp, sign(webhookId, timestamp, payload));

        verify(mapper).activatePolarSubscription(eq(42L), eq("cus_1"), eq("sub_1"), any(LocalDateTime.class), any(LocalDateTime.class));
        verify(mapper).markBillingWebhookProcessed(webhookId);
    }

    @Test
    void revokesPlusFromSignedRevokedSubscription() throws Exception {
        Instant now = Instant.now();
        byte[] payload = payload("subscription.revoked", "canceled", now);
        String webhookId = "evt_revoked";
        String timestamp = String.valueOf(now.getEpochSecond());
        when(mapper.claimBillingWebhook(eq(webhookId), eq("subscription.revoked"), any())).thenReturn(1);

        billing.handleWebhook(payload, webhookId, timestamp, sign(webhookId, timestamp, payload));

        verify(mapper).revokePolarSubscription(eq(42L), eq("cus_1"), eq("sub_1"), any(LocalDateTime.class));
    }

    @Test
    void rejectsTamperedWebhook() {
        Instant now = Instant.now();
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);
        assertThatThrownBy(() -> billing.verifySignature(payload, "evt_bad", String.valueOf(now.getEpochSecond()), "v1,AAAA", now))
            .isInstanceOf(SecurityException.class);
    }

    @Test
    void ignoresAlreadyClaimedWebhook() throws Exception {
        Instant now = Instant.now();
        byte[] payload = payload("subscription.active", "active", now);
        String webhookId = "evt_duplicate";
        String timestamp = String.valueOf(now.getEpochSecond());
        when(mapper.claimBillingWebhook(eq(webhookId), anyString(), any())).thenReturn(0);

        billing.handleWebhook(payload, webhookId, timestamp, sign(webhookId, timestamp, payload));

        verify(mapper, never()).activatePolarSubscription(anyLong(), anyString(), anyString(), any(), any());
    }

    private byte[] payload(String type, String status, Instant now) {
        String json = """
            {"type":"%s","timestamp":"%s","data":{"id":"sub_1","status":"%s","product_id":"%s","customer_id":"cus_1","current_period_end":"%s","customer":{"external_id":"42"}}}
            """.formatted(type, now, status, PRODUCT, now.plusSeconds(2_592_000));
        return json.getBytes(StandardCharsets.UTF_8);
    }

    private String sign(String id, String timestamp, byte[] payload) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] message = (id + "." + timestamp + "." + new String(payload, StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8);
        return "v1," + Base64.getEncoder().encodeToString(mac.doFinal(message));
    }
}
