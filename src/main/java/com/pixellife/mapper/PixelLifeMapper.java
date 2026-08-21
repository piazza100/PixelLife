package com.pixellife.mapper;

import com.pixellife.domain.BoardRow;
import org.apache.ibatis.annotations.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Mapper
public interface PixelLifeMapper {
    @Select("SELECT id FROM users WHERE auth_provider=#{provider} AND provider_subject=#{subject}")
    Long findMemberId(String provider, String subject);

    @Insert("INSERT INTO users(email,display_name,avatar_url,auth_provider,provider_subject,plan,locale) VALUES(#{email},#{displayName},#{avatarUrl},#{provider},#{subject},'FREE',#{locale}) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),email=VALUES(email),display_name=VALUES(display_name),avatar_url=VALUES(avatar_url),locale=VALUES(locale)")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertMember(Map<String, Object> member);

    @Select("SELECT id FROM users WHERE id=#{userId} FOR UPDATE")
    Long lockMember(Long userId);

    @Select("SELECT u.plan,u.paid_until AS paidUntil,u.grade_code AS gradeCode,(SELECT COUNT(*) FROM boards b WHERE b.user_id=u.id AND b.status='ACTIVE') AS activeCount FROM users u WHERE u.id=#{userId} FOR UPDATE")
    Map<String,Object> findBoardCreationContextForUpdate(Long userId);

    @Update("UPDATE users SET email=#{email},display_name=#{displayName},avatar_url=#{avatarUrl},locale=#{locale} WHERE id=#{id}")
    void updateMember(Map<String, Object> member);

    @Select("SELECT id,email,display_name AS displayName,avatar_url AS avatarUrl,plan,paid_until AS paidUntil,total_xp AS totalXp,grade_code AS gradeCode FROM users WHERE id=#{userId}")
    Map<String,Object> findMember(Long userId);

    @Select("""
        SELECT u.id AS memberId,u.email,u.plan,u.paid_until AS paidUntil,u.total_xp AS totalXp,u.grade_code AS gradeCode,
               b.id AS boardId,b.name AS boardName,b.board_type AS boardType,b.color,b.reward_species_code AS rewardSpeciesCode,
               b.reward_color_code AS rewardColorCode,s.name AS rewardSpeciesName,s.unicode_symbol AS rewardSpeciesSymbol,
               b.start_date AS startDate,b.goal_days AS goalDays,b.status,b.ended_at AS endedAt,b.completed_at AS completedAt,
               b.final_score AS finalScore,b.xp_awarded AS xpAwarded,b.created_at AS createdAt
        FROM users u
        LEFT JOIN boards b ON b.user_id=u.id
        LEFT JOIN plant_species s ON s.code=b.reward_species_code
        WHERE u.auth_provider=#{provider} AND u.provider_subject=#{subject}
        ORDER BY b.created_at DESC,b.id DESC
        """)
    List<Map<String,Object>> findBootstrapRows(String provider, String subject);

    @Select("SELECT id,email,display_name AS displayName,plan,paid_until AS paidUntil,total_xp AS totalXp,grade_code AS gradeCode,created_at AS createdAt FROM users ORDER BY id DESC LIMIT 200")
    List<Map<String,Object>> findTestUsers();

    @Delete("DELETE FROM users WHERE id=#{userId}")
    int deleteMember(Long userId);

    @Insert("INSERT IGNORE INTO billing_webhook_events(webhook_id,event_type,event_timestamp) VALUES(#{webhookId},#{eventType},#{eventTimestamp})")
    int claimBillingWebhook(String webhookId, String eventType, LocalDateTime eventTimestamp);

    @Update("UPDATE billing_webhook_events SET processed_at=CURRENT_TIMESTAMP(6) WHERE webhook_id=#{webhookId}")
    void markBillingWebhookProcessed(String webhookId);

    @Update("UPDATE users SET plan='PLUS',paid_until=#{paidUntil},polar_customer_id=COALESCE(#{customerId},polar_customer_id),polar_subscription_id=#{subscriptionId},billing_updated_at=#{eventTimestamp} WHERE id=#{userId} AND (billing_updated_at IS NULL OR billing_updated_at<=#{eventTimestamp})")
    int activatePolarSubscription(Long userId, String customerId, String subscriptionId, LocalDateTime paidUntil, LocalDateTime eventTimestamp);

    @Update("UPDATE users SET plan='FREE',paid_until=NULL,polar_customer_id=COALESCE(#{customerId},polar_customer_id),polar_subscription_id=COALESCE(#{subscriptionId},polar_subscription_id),billing_updated_at=#{eventTimestamp} WHERE id=#{userId} AND (billing_updated_at IS NULL OR billing_updated_at<=#{eventTimestamp})")
    int revokePolarSubscription(Long userId, String customerId, String subscriptionId, LocalDateTime eventTimestamp);

    @Select("SELECT COUNT(*) FROM boards WHERE user_id=#{userId} AND status='ACTIVE'")
    int countActiveBoards(Long userId);

    @Insert("INSERT IGNORE INTO daily_visits(user_id, visit_date) VALUES(#{userId}, #{date})")
    void recordVisit(Long userId, LocalDate date);

    @Select("SELECT b.id,b.user_id,b.name,b.board_type,b.color,b.reward_species_code,b.reward_color_code,s.name AS reward_species_name,s.unicode_symbol AS reward_species_symbol,b.start_date,b.goal_days,b.status,b.ended_at,b.completed_at,b.final_score,b.xp_awarded,b.created_at FROM boards b JOIN plant_species s ON s.code=b.reward_species_code WHERE b.user_id=#{userId} ORDER BY b.created_at DESC, b.id DESC")
    List<BoardRow> findBoards(Long userId);

    @Select("SELECT b.id,b.user_id,b.name,b.board_type,b.color,b.reward_species_code,b.reward_color_code,s.name AS reward_species_name,s.unicode_symbol AS reward_species_symbol,b.start_date,b.goal_days,b.status,b.ended_at,b.completed_at,b.final_score,b.xp_awarded,b.created_at FROM boards b JOIN plant_species s ON s.code=b.reward_species_code WHERE b.id=#{id} AND b.user_id=#{userId}")
    BoardRow findBoard(Long id, Long userId);

    @Insert("INSERT INTO boards(user_id,name,board_type,color,reward_species_code,reward_color_code,start_date,goal_days,ended_at,status) VALUES(#{userId},#{name},#{boardType},#{color},#{rewardSpeciesCode},#{rewardColorCode},#{startDate},#{goalDays},#{endedAt},'ACTIVE')")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertBoard(BoardRow board);

    @Insert("INSERT INTO pixel_entries(board_id,entry_date,numeric_value,success,emoji,note) VALUES(#{boardId},#{date},#{value},#{success},#{emoji},#{note}) ON DUPLICATE KEY UPDATE numeric_value=VALUES(numeric_value),success=VALUES(success),emoji=VALUES(emoji),note=VALUES(note),updated_at=CURRENT_TIMESTAMP")
    void upsertEntry(Long boardId, LocalDate date, Integer value, Boolean success, String emoji, String note);

    @Update("UPDATE boards SET last_recorded_at=CURRENT_TIMESTAMP WHERE id=#{boardId}")
    void touchBoard(Long boardId);

    @Delete("DELETE FROM boards WHERE id=#{boardId} AND user_id=#{userId} AND status='ACTIVE'")
    int deleteActiveBoard(Long boardId, Long userId);

    @Delete("DELETE FROM pixel_entries WHERE board_id=#{boardId} AND entry_date=#{date}")
    int deleteEntry(Long boardId, LocalDate date);

    @Select("SELECT entry_date AS entryDate,numeric_value AS numericValue,success,emoji,note FROM pixel_entries WHERE board_id=#{boardId} ORDER BY entry_date")
    List<Map<String, Object>> findEntries(Long boardId);

    @Select("SELECT e.board_id AS boardId,e.entry_date AS entryDate,e.numeric_value AS numericValue,e.success,e.emoji,e.note FROM pixel_entries e JOIN boards b ON b.id=e.board_id WHERE b.user_id=#{userId} ORDER BY e.board_id,e.entry_date")
    List<Map<String, Object>> findEntriesForUser(Long userId);

    @Select("SELECT COUNT(*) FROM pixel_entries WHERE board_id=#{boardId}")
    int countEntries(Long boardId);

    @Select("SELECT COUNT(*) FROM pixel_entries WHERE board_id=#{boardId} AND note IS NOT NULL AND note <> ''")
    int countNotes(Long boardId);

    @Update("UPDATE boards SET status='COMPLETED',completed_at=CURRENT_TIMESTAMP,final_score=#{score},xp_awarded=#{xp},ended_at=CURRENT_DATE WHERE id=#{boardId} AND user_id=#{userId} AND status='ACTIVE'")
    int completeBoard(Long boardId, Long userId, int score, int xp);

    @Insert("INSERT IGNORE INTO plants(user_id,board_id,season_code,species_code,color_code,variant_code,map_x,map_y,reward_rule_version) VALUES(#{userId},#{boardId},'NONE',#{species},#{color},'STANDARD',#{mapX},#{mapY},2)")
    void insertPlant(Long userId, Long boardId, String species, String color, int mapX, int mapY);

    @Update("UPDATE users SET total_xp=total_xp+#{xp} WHERE id=#{userId}")
    void addXp(Long userId, int xp);

    @Select("SELECT COALESCE(SUM(xp_awarded),0) FROM boards WHERE user_id=#{userId} AND completed_at>=#{date} AND completed_at<DATE_ADD(#{date}, INTERVAL 1 DAY)")
    int sumXpAwardedOnDate(Long userId, java.time.LocalDate date);

    @Select("""
        SELECT
          (SELECT COUNT(*) FROM daily_visits WHERE user_id=#{userId}) AS visitDays,
          (SELECT COUNT(*) FROM pixel_entries e JOIN boards b ON b.id=e.board_id WHERE b.user_id=#{userId}) AS pixelCount,
          (SELECT COUNT(*) FROM plants WHERE user_id=#{userId}) AS plantCount,
          (SELECT COUNT(DISTINCT species_code) FROM plants WHERE user_id=#{userId}) AS speciesCount,
          (SELECT COUNT(*) FROM boards WHERE user_id=#{userId} AND final_score=100) AS perfectCount,
          (SELECT COUNT(*) FROM pixel_entries e JOIN boards b ON b.id=e.board_id WHERE b.user_id=#{userId} AND e.note IS NOT NULL AND e.note<>'') AS noteCount,
          COALESCE((SELECT MAX(streak) FROM (SELECT COUNT(*) streak FROM (SELECT entry_date,DATE_SUB(entry_date,INTERVAL ROW_NUMBER() OVER(ORDER BY entry_date) DAY) grp FROM (SELECT DISTINCT e.entry_date FROM pixel_entries e JOIN boards b ON b.id=e.board_id WHERE b.user_id=#{userId}) d) x GROUP BY grp) y),0) AS maxStreak,
          (SELECT COUNT(DISTINCT board_type) FROM boards WHERE user_id=#{userId} AND status='COMPLETED') AS completedTypeCount,
          (SELECT COUNT(*) FROM boards WHERE user_id=#{userId} AND status='COMPLETED' AND goal_days>=90) AS longBoardCount
        """)
    Map<String,Object> findRewardMetrics(Long userId);

    @Select("SELECT COUNT(*) FROM daily_visits WHERE user_id=#{userId}") int countVisits(Long userId);
    @Select("SELECT COUNT(*) FROM pixel_entries e JOIN boards b ON b.id=e.board_id WHERE b.user_id=#{userId}") int countPixels(Long userId);
    @Select("SELECT COUNT(*) FROM plants WHERE user_id=#{userId}") int countPlants(Long userId);
    @Select("SELECT COUNT(DISTINCT species_code) FROM plants WHERE user_id=#{userId}") int countSpecies(Long userId);
    @Select("SELECT COUNT(*) FROM boards WHERE user_id=#{userId} AND final_score=100") int countPerfect(Long userId);
    @Select("SELECT COUNT(*) FROM pixel_entries e JOIN boards b ON b.id=e.board_id WHERE b.user_id=#{userId} AND e.note IS NOT NULL AND e.note<>''") int countAllNotes(Long userId);
    @Select("SELECT COUNT(DISTINCT board_type) FROM boards WHERE user_id=#{userId} AND status='COMPLETED'") int countCompletedTypes(Long userId);
    @Select("SELECT COUNT(*) FROM boards WHERE user_id=#{userId} AND status='COMPLETED' AND goal_days>=90") int countLongBoards(Long userId);
    @Select("SELECT COUNT(*) FROM plants WHERE user_id=#{userId}") int nextPlantIndex(Long userId);
    @Select("SELECT code,name,unicode_symbol AS symbol,weight_value AS weightValue,unlock_grade AS unlockGrade,sort_order AS sortOrder FROM plant_species WHERE sort_order<=#{limit} ORDER BY sort_order") List<Map<String,Object>> findSpeciesPool(int limit);
    @Select("SELECT code,name,unicode_symbol AS symbol,weight_value AS weightValue FROM plant_species WHERE code=#{code}") Map<String,Object> findSpecies(String code);
    @Select("SELECT code,css_color AS cssColor,sort_order AS sortOrder FROM plant_colors WHERE code=#{code}") Map<String,Object> findColor(String code);
    @Select("SELECT c.code,c.css_color AS cssColor,c.sort_order AS sortOrder FROM plant_colors c WHERE c.unlock_badge IS NULL OR EXISTS(SELECT 1 FROM user_badges ub WHERE ub.user_id=#{userId} AND ub.badge_code=c.unlock_badge) ORDER BY c.sort_order") List<Map<String,Object>> findUnlockedColors(Long userId);

    @Select("SELECT d.code,d.name,d.description,d.metric_code AS metricCode,d.target_value AS targetValue,d.unlock_color AS unlockColor,(ub.badge_code IS NOT NULL) AS earned FROM badge_definitions d LEFT JOIN user_badges ub ON ub.badge_code=d.code AND ub.user_id=#{userId} WHERE d.active=TRUE ORDER BY d.sort_order")
    List<Map<String, Object>> findBadges(Long userId);

    @Insert("INSERT IGNORE INTO user_badges(user_id,badge_code) VALUES(#{userId},#{code})")
    int awardBadge(Long userId, String code);

    @Select("SELECT total_xp AS totalXp,grade_code AS gradeCode FROM users WHERE id=#{userId}")
    Map<String, Object> findProgress(Long userId);

    @Update("UPDATE users SET grade_code=#{grade} WHERE id=#{userId}")
    void updateGrade(Long userId, String grade);

    @Select("SELECT p.id,p.species_code AS speciesCode,s.name AS speciesName,s.unicode_symbol AS symbol,p.color_code AS colorCode,c.css_color AS cssColor,p.map_x AS mapX,p.map_y AS mapY,p.earned_at AS earnedAt,p.board_id AS boardId,b.name AS boardName,b.xp_awarded AS xpAwarded FROM plants p JOIN plant_species s ON s.code=p.species_code JOIN plant_colors c ON c.code=p.color_code JOIN boards b ON b.id=p.board_id WHERE p.user_id=#{userId} ORDER BY p.earned_at DESC")
    List<Map<String, Object>> findPlants(Long userId);

    @Select("SELECT MAX(streak) FROM (SELECT COUNT(*) streak FROM (SELECT entry_date,DATE_SUB(entry_date,INTERVAL ROW_NUMBER() OVER(ORDER BY entry_date) DAY) grp FROM (SELECT DISTINCT e.entry_date FROM pixel_entries e JOIN boards b ON b.id=e.board_id WHERE b.user_id=#{userId}) d) x GROUP BY grp) y")
    Integer maxRecordStreak(Long userId);
}
