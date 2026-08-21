package com.pixellife;

import com.pixellife.service.PixelLifeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.flyway.enabled=false")
@EnabledIfEnvironmentVariable(named = "RUN_LOGIN_PERFORMANCE_AUDIT", matches = "true")
class LoginPerformanceAuditTest {
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired PixelLifeService service;

    @Test
    void measuresMemberBootstrapAndRewardsSeparately() {
        long userId = Long.parseLong(System.getenv("AUDIT_USER_ID"));
        Map<String, Object> source = jdbcTemplate.queryForMap("""
            SELECT provider_subject, email, locale
            FROM users WHERE id=?
            """, userId);

        long started = System.nanoTime();
        Map<String, Object> bootstrap = service.bootstrapForLogin(
            String.valueOf(source.get("provider_subject")),
            String.valueOf(source.get("email")),
            String.valueOf(source.get("locale")));
        long bootstrapMs = elapsedMs(started);

        started = System.nanoTime();
        long resolvedId = service.memberId(String.valueOf(source.get("provider_subject")));
        long cachedMemberMs = elapsedMs(started);

        started = System.nanoTime();
        Map<String, Object> rewards = service.rewards(userId);
        long rewardsMs = elapsedMs(started);

        assertThat(resolvedId).isEqualTo(userId);
        assertThat(bootstrap).containsKeys("member", "boards");
        assertThat(rewards).containsKeys("totalXp", "gradeCode", "badges", "plants");

        System.out.println("PIXELLIFE_LOGIN_PERFORMANCE=user:" + userId
            + ",cachedMemberMs:" + cachedMemberMs
            + ",bootstrapMs:" + bootstrapMs
            + ",rewardsMs:" + rewardsMs);
    }

    private long elapsedMs(long started) {
        return (System.nanoTime() - started) / 1_000_000;
    }
}
