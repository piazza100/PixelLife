package com.pixellife;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.flyway.enabled=false")
@EnabledIfEnvironmentVariable(named = "RUN_BOARD_REWARD_AUDIT", matches = "true")
class BoardRewardAuditTest {
    @Autowired JdbcTemplate jdbcTemplate;

    @Test
    void completedBoardXpMatchesItsRecordedDays() {
        long userId = Long.parseLong(System.getenv().getOrDefault("AUDIT_USER_ID", "1"));
        String boardName = System.getenv().getOrDefault("AUDIT_BOARD_NAME", "Test board 3333");
        int expectedXp = Integer.parseInt(System.getenv().getOrDefault("AUDIT_EXPECTED_XP", "5"));

        Map<String, Object> board = jdbcTemplate.queryForMap("""
            SELECT b.id, b.status, b.goal_days, b.final_score, b.xp_awarded,
                   COUNT(DISTINCT e.entry_date) AS recorded_days,
                   COUNT(DISTINCT p.id) AS plant_count
            FROM boards b
            LEFT JOIN pixel_entries e ON e.board_id=b.id
            LEFT JOIN plants p ON p.board_id=b.id
            WHERE b.user_id=? AND b.name=?
            GROUP BY b.id, b.status, b.goal_days, b.final_score, b.xp_awarded
            ORDER BY b.id DESC LIMIT 1
            """, userId, boardName);

        int recordedDays = ((Number) board.get("recorded_days")).intValue();
        int awardedXp = ((Number) board.get("xp_awarded")).intValue();
        assertThat(board.get("status")).isEqualTo("COMPLETED");
        assertThat(recordedDays).isEqualTo(expectedXp);
        assertThat(awardedXp).isEqualTo(expectedXp);
        assertThat(((Number) board.get("plant_count")).intValue()).isEqualTo(1);

        System.out.println("PIXELLIFE_BOARD_REWARD_AUDIT=user:" + userId
            + ",board:" + boardName
            + ",goalDays:" + board.get("goal_days")
            + ",recordedDays:" + recordedDays
            + ",completionRate:" + board.get("final_score") + "%"
            + ",xp:" + awardedXp
            + ",plantCount:1");
    }
}
