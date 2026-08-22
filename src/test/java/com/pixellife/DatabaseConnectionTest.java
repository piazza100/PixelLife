package com.pixellife;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.List;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "RUN_DB_TEST", matches = "true")
class DatabaseConnectionTest {
    @Autowired JdbcTemplate jdbcTemplate;

    @Test
    void connectsToConfiguredDatabaseOverSsl() {
        Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        assertThat(result).isEqualTo(1);
        List<String> tables = jdbcTemplate.queryForList(
            "SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY table_name",
            String.class);
        System.out.println("PIXELLIFE_DB_TABLES=" + String.join(",", tables));
        assertThat(tables).contains("SPRING_SESSION", "SPRING_SESSION_ATTRIBUTES");

        List<String> migrations = jdbcTemplate.queryForList(
            "SELECT CONCAT(version, ':', success) FROM flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank",
            String.class);
        System.out.println("PIXELLIFE_FLYWAY=" + String.join(",", migrations));
        assertThat(migrations).containsExactly("1:1", "2:1", "3:1", "4:1", "5:1", "6:1", "7:1", "8:1", "9:1", "10:1", "11:1", "12:1", "13:1", "14:1", "15:1", "16:1", "17:1", "18:1", "19:1", "20:1", "21:1");

        List<String> boardIndexes = jdbcTemplate.queryForList(
            "SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='boards'",
            String.class);
        assertThat(boardIndexes).contains("idx_boards_user_status_goal");
    }
}
