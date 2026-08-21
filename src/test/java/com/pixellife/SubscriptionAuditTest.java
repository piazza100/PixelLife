package com.pixellife;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.flyway.enabled=false")
@EnabledIfEnvironmentVariable(named = "RUN_SUBSCRIPTION_AUDIT", matches = "true")
class SubscriptionAuditTest {
    @Autowired JdbcTemplate jdbcTemplate;

    @Test
    void cancellationUpdateKeepsUserPlusUntilPaidPeriodEnds() {
        long userId = Long.parseLong(System.getenv().getOrDefault("AUDIT_USER_ID", "1"));
        Map<String, Object> user = jdbcTemplate.queryForMap("""
            SELECT plan, paid_until, billing_updated_at,
                   polar_customer_id IS NOT NULL AS has_customer,
                   polar_subscription_id IS NOT NULL AS has_subscription
            FROM users WHERE id=?
            """, userId);

        LocalDateTime paidUntil = (LocalDateTime) user.get("paid_until");
        LocalDateTime billingUpdatedAt = (LocalDateTime) user.get("billing_updated_at");
        Integer matchingProcessedUpdate = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM billing_webhook_events
            WHERE event_type='subscription.updated'
              AND event_timestamp=? AND processed_at IS NOT NULL
            """, Integer.class, billingUpdatedAt);

        assertThat(user.get("plan")).isEqualTo("PLUS");
        assertThat(paidUntil).isAfter(LocalDateTime.now(ZoneOffset.UTC));
        assertThat(((Number) user.get("has_customer")).intValue()).isEqualTo(1);
        assertThat(((Number) user.get("has_subscription")).intValue()).isEqualTo(1);
        assertThat(matchingProcessedUpdate).isEqualTo(1);

        System.out.println("PIXELLIFE_SUBSCRIPTION_AUDIT=user:" + userId
            + ",plan:" + user.get("plan")
            + ",paidUntil:" + paidUntil
            + ",processedUpdate:true");
    }
}
