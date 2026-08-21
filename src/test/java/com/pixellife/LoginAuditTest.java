package com.pixellife;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.flyway.enabled=false")
@EnabledIfEnvironmentVariable(named = "RUN_LOGIN_AUDIT", matches = "true")
class LoginAuditTest {
    @Autowired JdbcTemplate jdbcTemplate;

    @Test
    void memberAndRecentOauthSessionAreReadable() {
        long userId = Long.parseLong(System.getenv("AUDIT_USER_ID"));
        Map<String, Object> user = jdbcTemplate.queryForMap("""
            SELECT id, auth_provider, provider_subject IS NOT NULL AS has_subject,
                   email IS NOT NULL AS has_email, locale, plan
            FROM users WHERE id=?
            """, userId);

        Integer activeSessions = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM SPRING_SESSION
            WHERE EXPIRY_TIME > UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000
            """, Integer.class);
        Integer recentSessions = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM SPRING_SESSION
            WHERE LAST_ACCESS_TIME >= (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) - 3600) * 1000
            """, Integer.class);
        Integer oauthAttributes = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM SPRING_SESSION_ATTRIBUTES
            WHERE ATTRIBUTE_NAME LIKE '%SECURITY_CONTEXT%'
            """, Integer.class);

        assertThat(((Number) user.get("id")).longValue()).isEqualTo(userId);
        assertThat(user.get("auth_provider")).isEqualTo("GOOGLE");
        assertThat(((Number) user.get("has_subject")).intValue()).isEqualTo(1);
        assertThat(((Number) user.get("has_email")).intValue()).isEqualTo(1);

        System.out.println("PIXELLIFE_LOGIN_AUDIT=user:" + userId
            + ",provider:" + user.get("auth_provider")
            + ",locale:" + user.get("locale")
            + ",plan:" + user.get("plan")
            + ",activeSessions:" + activeSessions
            + ",recentSessions:" + recentSessions
            + ",securityContexts:" + oauthAttributes);
    }
}
