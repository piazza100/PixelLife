package com.pixellife;

import com.pixellife.domain.BoardRow;
import com.pixellife.service.PixelLifeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = "spring.flyway.enabled=false")
@EnabledIfEnvironmentVariable(named = "RUN_DB_WORKFLOW_TEST", matches = "true")
@Transactional
class DatabaseWorkflowIntegrationTest {
    @Autowired PixelLifeService service;
    @Autowired JdbcTemplate jdbcTemplate;

    @Test
    void freeLimitCompletionAndReplacementBoardWorkEndToEnd() {
        long userId = member("free");
        LocalDate start = LocalDate.now().minusDays(2);
        BoardRow first = service.createBoard(userId, "Free one", "LEVEL", start, 3);
        service.createBoard(userId, "Free two", "CHECK", start, 3);
        service.createBoard(userId, "Free three", "MOOD", start, 3);

        assertThatThrownBy(() -> service.createBoard(userId, "Free four", "LEVEL", start, 3))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("3 active boards");

        service.fillTestEntries(userId, first.getId(), start, LocalDate.now());
        Map<String, Object> completion = service.complete(userId, first.getId());
        assertThat(completion.get("score")).isEqualTo(100);
        assertThat(completion.get("xp")).isEqualTo(3);
        @SuppressWarnings("unchecked") Map<String, Object> completedSpecies = (Map<String, Object>) completion.get("species");
        @SuppressWarnings("unchecked") Map<String, Object> completedColor = (Map<String, Object>) completion.get("color");
        assertThat(completedSpecies.get("code")).isEqualTo(first.getRewardSpeciesCode());
        assertThat(completedColor.get("code")).isEqualTo(first.getRewardColorCode());
        service.createBoard(userId, "Replacement", "LEVEL", start, 3);

        assertThat(count("SELECT COUNT(*) FROM boards WHERE user_id=? AND status='ACTIVE'", userId)).isEqualTo(3);
        assertThat(count("SELECT COUNT(*) FROM boards WHERE user_id=? AND status='COMPLETED'", userId)).isEqualTo(1);
        assertThat(count("SELECT COUNT(*) FROM plants WHERE user_id=?", userId)).isEqualTo(1);
        assertThat(count("SELECT total_xp FROM users WHERE id=?", userId)).isEqualTo(3);
        assertThat(jdbcTemplate.queryForObject("SELECT grade_code FROM users WHERE id=?", String.class, userId)).isEqualTo("SEED");
    }

    @Test
    void plusLimitAndFreeDowngradeKeepExistingBoardsWritable() {
        long userId = member("plus");
        jdbcTemplate.update("UPDATE users SET plan='PLUS',paid_until=DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id=?", userId);
        LocalDate start = LocalDate.now().minusDays(2);
        for (int i = 1; i <= 10; i++) service.createBoard(userId, "Plus " + i, "LEVEL", start, 3);
        assertThatThrownBy(() -> service.createBoard(userId, "Plus 11", "LEVEL", start, 3))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("10 active boards");

        jdbcTemplate.update("UPDATE users SET plan='FREE',paid_until=NULL WHERE id=?", userId);
        List<BoardRow> boards = jdbcTemplate.query(
            "SELECT id,user_id,name,board_type,color,start_date,goal_days,status,ended_at,completed_at,final_score,xp_awarded,created_at FROM boards WHERE user_id=? ORDER BY id",
            (rs, rowNum) -> {
                BoardRow board = new BoardRow();
                board.setId(rs.getLong("id")); board.setUserId(rs.getLong("user_id"));
                board.setName(rs.getString("name")); board.setBoardType(rs.getString("board_type"));
                board.setColor(rs.getString("color")); board.setStartDate(rs.getObject("start_date", LocalDate.class));
                board.setGoalDays(rs.getObject("goal_days", Integer.class)); board.setStatus(rs.getString("status"));
                board.setEndedAt(rs.getObject("ended_at", LocalDate.class));
                return board;
            }, userId);
        service.saveEntry(userId, boards.get(0).getId(), LocalDate.now(), 3, null, null, "still writable");
        assertThatThrownBy(() -> service.createBoard(userId, "Blocked after downgrade", "LEVEL", start, 3))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("3 active boards");

        for (int i = 0; i < 8; i++) service.deleteBoard(userId, boards.get(i).getId());
        service.createBoard(userId, "Free slot", "CHECK", start, 3);
        assertThat(count("SELECT COUNT(*) FROM boards WHERE user_id=? AND status='ACTIVE'", userId)).isEqualTo(3);
    }

    @Test
    void everyGradeDrawsOnlyFromItsUnlockedEqualWeightSpeciesPool() {
        record GradeCase(String grade, int initialXp, Set<String> species) {}
        List<GradeCase> cases = List.of(
            new GradeCase("SEED", 0, Set.of("OAK", "CACTUS")),
            new GradeCase("SPROUT", 100, Set.of("OAK", "CACTUS", "TULIP", "PINE")),
            new GradeCase("GROVE", 300, Set.of("OAK", "CACTUS", "TULIP", "PINE", "FERN", "SUNFLOWER")),
            new GradeCase("GARDENER", 700, Set.of("OAK", "CACTUS", "TULIP", "PINE", "FERN", "SUNFLOWER", "MAPLE", "LOTUS")),
            new GradeCase("BOTANIST", 1500, Set.of("OAK", "CACTUS", "TULIP", "PINE", "FERN", "SUNFLOWER", "MAPLE", "LOTUS", "BAMBOO", "CHERRY")),
            new GradeCase("CONSERVATOR", 3000, Set.of("OAK", "CACTUS", "TULIP", "PINE", "FERN", "SUNFLOWER", "MAPLE", "LOTUS", "BAMBOO", "CHERRY", "PALM", "CRYSTAL"))
        );
        LocalDate start = LocalDate.now().minusDays(2);
        for (GradeCase gradeCase : cases) {
            long userId = member("grade-" + gradeCase.grade());
            jdbcTemplate.update("UPDATE users SET total_xp=?,grade_code=? WHERE id=?", gradeCase.initialXp(), gradeCase.grade(), userId);
            BoardRow board = service.createBoard(userId, gradeCase.grade(), "LEVEL", start, 3);
            assertThat(gradeCase.species()).as(gradeCase.grade()).contains(board.getRewardSpeciesCode());
            service.fillTestEntries(userId, board.getId(), start, LocalDate.now());
            Map<String, Object> result = service.complete(userId, board.getId());
            @SuppressWarnings("unchecked") Map<String, Object> species = (Map<String, Object>) result.get("species");
            assertThat(species.get("code")).isEqualTo(board.getRewardSpeciesCode());
            assertThat(count("SELECT COUNT(*) FROM plant_species WHERE sort_order<=? AND weight_value=1", gradeCase.species().size()))
                .isEqualTo(gradeCase.species().size());
        }
    }

    @Test
    void allBadgeConditionsUnlockAllThirteenPlantColors() {
        long userId = member("badges");
        for (int day = 1; day < 7; day++) {
            jdbcTemplate.update("INSERT INTO daily_visits(user_id,visit_date) VALUES(?,?)", userId, LocalDate.now().minusDays(day));
        }

        LocalDate longStart = LocalDate.now().minusDays(100);
        BoardRow longBoard = service.createBoard(userId, "Long", "LEVEL", longStart, 90);
        service.fillTestEntries(userId, longBoard.getId(), longStart, longStart.plusDays(89));
        service.complete(userId, longBoard.getId());

        LocalDate shortStart = LocalDate.now().minusDays(2);
        String[] types = {"CHECK", "MOOD", "LEVEL", "CHECK", "MOOD", "LEVEL", "CHECK", "MOOD", "LEVEL"};
        for (int i = 0; i < types.length; i++) {
            BoardRow board = service.createBoard(userId, "Badge " + i, types[i], shortStart, 3);
            service.fillTestEntries(userId, board.getId(), shortStart, LocalDate.now());
            service.complete(userId, board.getId());
        }

        List<Long> plantIds = jdbcTemplate.queryForList("SELECT id FROM plants WHERE user_id=? ORDER BY id LIMIT 4", Long.class, userId);
        String[] species = {"OAK", "CACTUS", "TULIP", "PINE"};
        for (int i = 0; i < plantIds.size(); i++) jdbcTemplate.update("UPDATE plants SET species_code=? WHERE id=?", species[i], plantIds.get(i));

        Map<String, Object> rewards = service.rewards(userId);
        assertThat(count("SELECT COUNT(*) FROM user_badges WHERE user_id=?", userId)).isEqualTo(11);
        @SuppressWarnings("unchecked") List<Map<String, Object>> colors = (List<Map<String, Object>>) rewards.get("unlockedColors");
        assertThat(colors).hasSize(13);
        assertThat(count("SELECT COUNT(*) FROM plants WHERE user_id=?", userId)).isEqualTo(10);
    }

    private long member(String label) {
        String unique = label + "-" + UUID.randomUUID();
        return service.ensureMember(unique, unique + "@test.invalid", "Workflow Test", null, "en");
    }

    private int count(String sql, Object... args) {
        return jdbcTemplate.queryForObject(sql, Integer.class, args);
    }
}
