package com.pixellife;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.flyway.enabled=false")
@EnabledIfEnvironmentVariable(named = "RUN_DB_TEST", matches = "true")
class DatabaseIntegrityTest {
    @Autowired JdbcTemplate jdbcTemplate;

    @Test
    void coreRelationshipsAndUniqueDailyRecordsAreConsistent() {
        assertZero("temporary workflow users left after rollback", """
            SELECT COUNT(*) FROM users WHERE email LIKE '%@test.invalid'
            """);
        assertZero("duplicate daily records", """
            SELECT COUNT(*) FROM (
              SELECT board_id, entry_date FROM pixel_entries
              GROUP BY board_id, entry_date HAVING COUNT(*) > 1
            ) duplicates
            """);
        assertZero("orphan records", """
            SELECT COUNT(*) FROM pixel_entries e
            LEFT JOIN boards b ON b.id=e.board_id WHERE b.id IS NULL
            """);
        assertZero("orphan boards", """
            SELECT COUNT(*) FROM boards b
            LEFT JOIN users u ON u.id=b.user_id WHERE u.id IS NULL
            """);
        assertZero("plant ownership mismatch", """
            SELECT COUNT(*) FROM plants p
            JOIN boards b ON b.id=p.board_id
            WHERE p.user_id<>b.user_id
            """);
        assertZero("unknown plant species", """
            SELECT COUNT(*) FROM plants p
            LEFT JOIN plant_species s ON s.code=p.species_code WHERE s.code IS NULL
            """);
        assertZero("unknown plant colors", """
            SELECT COUNT(*) FROM plants p
            LEFT JOIN plant_colors c ON c.code=p.color_code WHERE c.code IS NULL
            """);
        assertZero("unknown board reward species", """
            SELECT COUNT(*) FROM boards b
            LEFT JOIN plant_species s ON s.code=b.reward_species_code WHERE s.code IS NULL
            """);
        assertZero("unknown board reward colors", """
            SELECT COUNT(*) FROM boards b
            LEFT JOIN plant_colors c ON c.code=b.reward_color_code WHERE c.code IS NULL
            """);
        assertZero("board and planned plant colors differ", """
            SELECT COUNT(*) FROM boards b
            JOIN plant_colors c ON c.code=b.reward_color_code
            WHERE UPPER(b.color)<>UPPER(c.css_color)
            """);
        assertZero("unknown badges", """
            SELECT COUNT(*) FROM user_badges ub
            LEFT JOIN badge_definitions bd ON bd.code=ub.badge_code WHERE bd.code IS NULL
            """);
    }

    @Test
    void completedBoardRewardsAndUserGradesAreConsistent() {
        assertZero("invalid completed board score or XP", """
            SELECT COUNT(*) FROM boards
            WHERE status='COMPLETED' AND (
              completed_at IS NULL OR final_score IS NULL OR
              final_score < 0 OR final_score > 100 OR xp_awarded < 0 OR
              xp_awarded <> LEAST(
                (SELECT COUNT(*) FROM pixel_entries e WHERE e.board_id=boards.id),
                CASE WHEN goal_days IS NOT NULL THEN GREATEST(goal_days,1)
                     ELSE GREATEST(DATEDIFF(DATE(completed_at),start_date)+1,1) END
              )
            )
            """);
        assertZero("reward on active board", """
            SELECT COUNT(*) FROM plants p
            JOIN boards b ON b.id=p.board_id WHERE b.status<>'COMPLETED'
            """);
        assertZero("multiple plants for one board", """
            SELECT COUNT(*) FROM (
              SELECT board_id FROM plants GROUP BY board_id HAVING COUNT(*) > 1
            ) duplicates
            """);
        assertZero("completed board without one plant", """
            SELECT COUNT(*) FROM boards b
            LEFT JOIN plants p ON p.board_id=b.id
            WHERE b.status='COMPLETED' AND p.id IS NULL
            """);
        assertZero("completed reward differs from its board plan", """
            SELECT COUNT(*) FROM boards b
            JOIN plants p ON p.board_id=b.id
            WHERE b.status='COMPLETED' AND
              (p.species_code<>b.reward_species_code OR p.color_code<>b.reward_color_code)
            """);
        String xpMismatchSql = """
            SELECT COUNT(*) FROM users u
            LEFT JOIN (
              SELECT user_id, SUM(xp_awarded) awarded_xp FROM boards GROUP BY user_id
            ) totals ON totals.user_id=u.id
            WHERE u.total_xp<>COALESCE(totals.awarded_xp,0)
            """;
        List<Map<String, Object>> xpMismatches = jdbcTemplate.queryForList("""
            SELECT u.id user_id, u.total_xp, COALESCE(totals.awarded_xp,0) awarded_xp
            FROM users u
            LEFT JOIN (
              SELECT user_id, SUM(xp_awarded) awarded_xp FROM boards GROUP BY user_id
            ) totals ON totals.user_id=u.id
            WHERE u.total_xp<>COALESCE(totals.awarded_xp,0)
            ORDER BY u.id
            """);
        System.out.println("PIXELLIFE_XP_MISMATCHES=" + xpMismatches);
        assertZero("user XP does not match awarded board XP", xpMismatchSql);
        assertZero("plant color was not unlocked", """
            SELECT COUNT(*) FROM plants p
            JOIN plant_colors c ON c.code=p.color_code
            LEFT JOIN user_badges ub
              ON ub.user_id=p.user_id AND ub.badge_code=c.unlock_badge
            WHERE c.unlock_badge IS NOT NULL AND ub.user_id IS NULL
            """);
        assertZero("stored grade does not match total XP", """
            SELECT COUNT(*) FROM users
            WHERE grade_code <> CASE
              WHEN total_xp >= 150 THEN 'CONSERVATOR'
              WHEN total_xp >= 120 THEN 'BOTANIST'
              WHEN total_xp >= 90 THEN 'GARDENER'
              WHEN total_xp >= 60 THEN 'GROVE'
              WHEN total_xp >= 30 THEN 'SPROUT'
              ELSE 'SEED' END
            """);
    }

    @Test
    void rewardCatalogUsesCanonicalValues() {
        Map<String, Object> catalog = jdbcTemplate.queryForMap("""
            SELECT
              (SELECT COUNT(*) FROM plant_species) species_count,
              (SELECT COUNT(*) FROM plant_species WHERE weight_value=1) equal_weight_count,
              (SELECT COUNT(*) FROM plant_colors) color_count,
              (SELECT COUNT(*) FROM badge_definitions WHERE active=TRUE) badge_count
            """);
        System.out.println("PIXELLIFE_REWARD_CATALOG=" + catalog);
        assertThat(((Number) catalog.get("species_count")).intValue()).isEqualTo(12);
        assertThat(((Number) catalog.get("equal_weight_count")).intValue()).isEqualTo(12);
        assertThat(((Number) catalog.get("color_count")).intValue()).isEqualTo(13);
        assertThat(((Number) catalog.get("badge_count")).intValue()).isEqualTo(11);
    }

    private void assertZero(String label, String sql) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
        System.out.println("PIXELLIFE_INTEGRITY_" + label.replace(' ', '_').toUpperCase() + "=" + count);
        assertThat(count).as(label).isZero();
    }
}
