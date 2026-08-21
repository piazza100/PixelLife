package com.pixellife.service;

import com.pixellife.domain.BoardRow;
import com.pixellife.mapper.PixelLifeMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class PixelLifeService {
    private final PixelLifeMapper mapper;
    private final BoardScoringService scoring;

    public PixelLifeService(PixelLifeMapper mapper, BoardScoringService scoring) { this.mapper = mapper; this.scoring = scoring; }

    @Transactional
    public long ensureMember(String subject, String email, String displayName, String avatarUrl, String locale) {
        if (subject == null || subject.isBlank()) throw new IllegalArgumentException("Invalid login");
        Map<String,Object> member = new HashMap<>();
        member.put("provider", "GOOGLE"); member.put("subject", subject);
        member.put("email", email); member.put("displayName", displayName); member.put("avatarUrl", avatarUrl); member.put("locale", safeLocale(locale));
        mapper.insertMember(member);
        long id = ((Number) member.get("id")).longValue();
        return id;
    }

    public long memberId(String subject) {
        Long id = mapper.findMemberId("GOOGLE", subject);
        if (id == null) throw new NoSuchElementException("Account not found");
        return id;
    }

    @Transactional
    public long resolveOrCreateMember(String subject, String email, String locale) {
        Long id = mapper.findMemberId("GOOGLE", subject);
        return id != null ? id : ensureMember(subject, email, null, null, locale);
    }

    public Map<String,Object> member(long userId) {
        Map<String,Object> result = new HashMap<>(mapper.findMember(userId));
        result.put("effectivePlan", isPlus(result) ? "PLUS" : "FREE");
        result.put("activeBoardLimit", isPlus(result) ? 10 : 3);
        return result;
    }

    @Transactional
    public void deleteAccount(long userId) {
        Map<String,Object> account = mapper.findMember(userId);
        if (account == null) throw new NoSuchElementException("Account not found");
        if (isPlus(account)) throw new IllegalStateException("Cancel Plus and wait until the paid period ends before deleting your account");
        if (mapper.deleteMember(userId) != 1) throw new IllegalStateException("Account could not be deleted");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> bootstrap(long userId) {
        Map<String,Object> account = member(userId);
        return Map.of("member", account, "boards", mapper.findBoards(userId));
    }

    @Transactional
    public BoardRow createBoard(long userId, String name, String type, LocalDate startDate, Integer goalDays) {
        mapper.lockMember(userId);
        Map<String,Object> account = mapper.findMember(userId);
        int limit = isPlus(account) ? 10 : 3;
        if (mapper.countActiveBoards(userId) >= limit) throw new IllegalStateException("Your plan allows " + limit + " active board" + (limit == 1 ? "" : "s"));
        String boardType = switch (type == null ? "" : type.toUpperCase(Locale.ROOT)) {
            case "LEVEL", "CHECK", "MOOD" -> type.toUpperCase(Locale.ROOT);
            default -> throw new IllegalArgumentException("Unsupported board type");
        };
        if (name == null || name.isBlank() || name.length() > 24) throw new IllegalArgumentException("Board name must be 1 to 24 characters");
        if (goalDays != null && (goalDays < 3 || goalDays > 3650)) throw new IllegalArgumentException("Goal days must be between 3 and 3650");
        LocalDate safeStartDate = startDate == null ? LocalDate.now() : startDate;
        if (safeStartDate.isAfter(LocalDate.now())) throw new IllegalArgumentException("Start date cannot be in the future");
        Map<String,Object> progress = mapper.findProgress(userId);
        String currentGrade = grade(number(progress.get("totalXp")));
        Map<String,Object> species = weightedPick(mapper.findSpeciesPool(poolLimit(currentGrade)));
        List<Map<String,Object>> unlockedColors = mapper.findUnlockedColors(userId);
        Map<String,Object> plantColor = unlockedColors.get(ThreadLocalRandom.current().nextInt(unlockedColors.size()));
        BoardRow board = new BoardRow(); board.setUserId(userId); board.setName(name.trim()); board.setBoardType(boardType);
        board.setRewardSpeciesCode(String.valueOf(species.get("code"))); board.setRewardSpeciesName(String.valueOf(species.get("name"))); board.setRewardSpeciesSymbol(String.valueOf(species.get("symbol")));
        board.setRewardColorCode(String.valueOf(plantColor.get("code"))); board.setColor(String.valueOf(plantColor.get("cssColor")));
        board.setStartDate(safeStartDate); board.setGoalDays(goalDays); board.setStatus("ACTIVE");
        if (goalDays != null) board.setEndedAt(board.getStartDate().plusDays(goalDays - 1L));
        mapper.insertBoard(board); return board;
    }

    @Transactional
    public BoardRow importGuestBoard(long userId, String name, String type, LocalDate startDate, Integer goalDays, List<GuestEntry> entries) {
        BoardRow board = createBoard(userId, name, type, startDate, goalDays);
        for (GuestEntry entry : entries) {
            saveEntry(userId, board.getId(), entry.date(), entry.value(), entry.success(), entry.emoji(), entry.note());
        }
        return board;
    }

    public record GuestEntry(LocalDate date, Integer value, Boolean success, String emoji, String note) {}

    @Transactional
    public void saveEntry(long userId, long boardId, LocalDate date, Integer value, Boolean success, String emoji, String note) {
        BoardRow board = requireBoard(userId, boardId);
        if (!"ACTIVE".equals(board.getStatus())) throw new IllegalStateException("Finished boards are read-only");
        requireWritable(userId, boardId);
        if (date.isBefore(board.getStartDate()) || date.isAfter(LocalDate.now()) || (board.getEndedAt() != null && date.isAfter(board.getEndedAt()))) throw new IllegalArgumentException("Entry date is outside the board range");
        if ("LEVEL".equals(board.getBoardType()) && (value == null || value < 1 || value > 5)) throw new IllegalArgumentException("Level must be 1 to 5");
        if ("CHECK".equals(board.getBoardType()) && success == null) throw new IllegalArgumentException("Yes or no is required");
        if ("MOOD".equals(board.getBoardType()) && (emoji == null || emoji.isBlank())) throw new IllegalArgumentException("Mood is required");
        if (note != null && note.length() > 280) throw new IllegalArgumentException("Note is too long");
        mapper.upsertEntry(boardId, date, value, success, emoji, note == null || note.isBlank() ? null : note.trim());
        mapper.touchBoard(boardId);
    }

    @Transactional
    public void deleteEntry(long userId, long boardId, LocalDate date) {
        BoardRow board = requireBoard(userId, boardId);
        if (!"ACTIVE".equals(board.getStatus()) || !date.equals(LocalDate.now())) throw new IllegalStateException("Only today's active entry can be reset");
        requireWritable(userId, boardId);
        mapper.deleteEntry(boardId, date);
    }

    @Transactional
    public void deleteBoard(long userId, long boardId) {
        mapper.lockMember(userId);
        BoardRow board = requireBoard(userId, boardId);
        if (!"ACTIVE".equals(board.getStatus())) throw new IllegalStateException("Completed boards cannot be deleted");
        requireWritable(userId, boardId);
        if (mapper.deleteActiveBoard(boardId, userId) != 1) throw new IllegalStateException("Board could not be deleted");
    }

    public Map<String, Object> board(long userId, long boardId) {
        BoardRow board = requireBoard(userId, boardId);
        return Map.of("board", board, "entries", mapper.findEntries(boardId));
    }

    @Transactional
    public Map<String, Object> fillTestEntries(long userId, long boardId, int days) {
        if (days < 1 || days > 365) throw new IllegalArgumentException("Test days must be between 1 and 365");
        BoardRow board = requireBoard(userId, boardId);
        LocalDate first = LocalDate.now().minusDays(days - 1L);
        if (first.isBefore(board.getStartDate())) first = board.getStartDate();
        return fillTestEntries(userId, boardId, first, LocalDate.now());
    }

    public List<Map<String, Object>> testBoards(long userId) {
        return mapper.findBoards(userId).stream().map(board -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", board.getId()); item.put("name", board.getName());
            item.put("type", board.getBoardType()); item.put("status", board.getStatus());
            item.put("startDate", board.getStartDate()); item.put("endDate", board.getEndedAt());
            item.put("goalDays", board.getGoalDays()); item.put("recordCount", mapper.countEntries(board.getId()));
            return item;
        }).toList();
    }

    public List<Map<String, Object>> testUsers() { return mapper.findTestUsers(); }

    @Transactional
    public Map<String, Object> fillTestEntries(long userId, long boardId, LocalDate first, LocalDate last) {
        BoardRow board = requireBoard(userId, boardId);
        if (!"ACTIVE".equals(board.getStatus())) throw new IllegalStateException("Finished boards are read-only");
        requireWritable(userId, boardId);
        if (first == null || last == null || first.isAfter(last)) throw new IllegalArgumentException("Invalid test date range");
        if (first.isBefore(board.getStartDate())) throw new IllegalArgumentException("Test date is before the board start date");
        if (last.isAfter(LocalDate.now())) throw new IllegalArgumentException("Future test entries are not allowed");
        if (board.getEndedAt() != null && last.isAfter(board.getEndedAt())) throw new IllegalArgumentException("Test date is after the board end date");
        if (java.time.temporal.ChronoUnit.DAYS.between(first, last) >= 365) throw new IllegalArgumentException("Test range must be 365 days or less");
        int saved = 0;
        for (LocalDate date = first; !date.isAfter(last); date = date.plusDays(1)) {
            Integer value = "LEVEL".equals(board.getBoardType()) ? (saved % 5) + 1 : null;
            Boolean success = "CHECK".equals(board.getBoardType()) ? Boolean.TRUE : null;
            String emoji = "MOOD".equals(board.getBoardType()) ? List.of("😄", "😊", "😐", "😔", "😴").get(saved % 5) : null;
            mapper.upsertEntry(boardId, date, value, success, emoji, "Test day " + (saved + 1));
            saved++;
        }
        mapper.touchBoard(boardId);
        return Map.of("saved", saved, "from", first, "to", last, "type", board.getBoardType());
    }

    @Transactional
    public Map<String, Object> complete(long userId, long boardId) {
        mapper.lockMember(userId);
        BoardRow board = requireBoard(userId, boardId);
        if (!"ACTIVE".equals(board.getStatus())) throw new IllegalStateException("Board is already complete");
        requireWritable(userId, boardId);
        LocalDate eligibleDate = board.getGoalDays() == null
            ? board.getStartDate().plusDays(6)
            : board.getStartDate().plusDays(Math.max(0, Math.floorDiv(board.getGoalDays() + 1, 2) - 1L));
        if (LocalDate.now().isBefore(eligibleDate)) throw new IllegalStateException("This board can finish on " + eligibleDate);
        int elapsed = (int) (LocalDate.now().toEpochDay() - board.getStartDate().toEpochDay()) + 1;
        int goal = board.getGoalDays() == null ? elapsed : board.getGoalDays();
        BoardScoringService.Score result = scoring.score(goal, mapper.countEntries(boardId), mapper.countNotes(boardId));
        int awardedXp = result.xp();
        if (mapper.completeBoard(boardId, userId, result.points(), awardedXp) != 1) throw new IllegalStateException("Board could not be completed");
        if (awardedXp > 0) mapper.addXp(userId, awardedXp);
        int totalXp = number(mapper.findProgress(userId).get("totalXp"));
        String grade = grade(totalXp); mapper.updateGrade(userId, grade);
        Map<String,Object> plantSpecies = mapper.findSpecies(board.getRewardSpeciesCode());
        Map<String,Object> plantColor = mapper.findColor(board.getRewardColorCode());
        int index = mapper.nextPlantIndex(userId);
        mapper.insertPlant(userId, boardId, String.valueOf(plantSpecies.get("code")), String.valueOf(plantColor.get("code")), index % 12, index / 12);
        refreshRewards(userId);
        return Map.of("score", result.points(), "xp", awardedXp, "grade", grade, "species", plantSpecies, "color", plantColor);
    }

    @Transactional
    public Map<String, Object> rewards(long userId) {
        mapper.recordVisit(userId, LocalDate.now());
        return rewards(userId, member(userId));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> entries(long userId) {
        return mapper.findEntriesForUser(userId);
    }

    private Map<String,Object> rewards(long userId, Map<String,Object> account) {
        RewardSnapshot snapshot = refreshRewards(userId);
        Map<String, Object> progress = new HashMap<>();
        progress.put("totalXp", account.get("totalXp")); progress.put("gradeCode", account.get("gradeCode"));
        progress.put("badges", badgeProgress(snapshot.metrics(), snapshot.badges())); progress.put("plants", mapper.findPlants(userId));
        String grade=String.valueOf(progress.get("gradeCode"));List<Map<String,Object>> pool=mapper.findSpeciesPool(poolLimit(grade));int total=pool.stream().mapToInt(v->number(v.get("weightValue"))).sum();
        pool.forEach(v->v.put("chance",Math.round(number(v.get("weightValue"))*1000d/total)/10d));
        progress.put("speciesPool",pool);progress.put("unlockedColors",mapper.findUnlockedColors(userId));progress.put("gradeGuide", gradeGuide()); return progress;
    }

    private BoardRow requireBoard(long userId, long boardId) {
        BoardRow board = mapper.findBoard(boardId, userId); if (board == null) throw new NoSuchElementException("Board not found"); return board;
    }

    private void requireWritable(long userId, long boardId) {
        // Existing active boards stay writable after a Plus subscription ends.
        // The shared three-board limit is enforced only when a new board is created.
    }

    private boolean isPlus(Map<String,Object> account) {
        if (account == null || !"PLUS".equals(String.valueOf(account.get("plan")))) return false;
        Object paidUntil = account.get("paidUntil");
        return paidUntil instanceof LocalDateTime time && !time.isBefore(LocalDateTime.now(ZoneOffset.UTC));
    }

    private RewardSnapshot refreshRewards(long userId) {
        Map<String, Integer> metrics = metrics(userId);
        List<Map<String,Object>> badges = mapper.findBadges(userId); boolean changed = false;
        for (Map<String, Object> badge : badges) {
            boolean earned = Boolean.TRUE.equals(badge.get("earned")) || number(badge.get("earned")) == 1;
            int current = metrics.getOrDefault(String.valueOf(badge.get("metricCode")), 0);
            if (!earned && current >= number(badge.get("targetValue"))) changed |= mapper.awardBadge(userId, String.valueOf(badge.get("code"))) == 1;
        }
        return new RewardSnapshot(metrics, changed ? mapper.findBadges(userId) : badges);
    }

    private List<Map<String, Object>> badgeProgress(Map<String,Integer> metrics, List<Map<String,Object>> badges) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> source : badges) { Map<String, Object> item = new HashMap<>(source); item.put("currentValue", metrics.getOrDefault(String.valueOf(source.get("metricCode")), 0)); result.add(item); }
        return result;
    }

    private record RewardSnapshot(Map<String,Integer> metrics, List<Map<String,Object>> badges) {}

    private Map<String, Integer> metrics(long userId) {
        Map<String,Object> row=mapper.findRewardMetrics(userId);Map<String,Integer> m=new HashMap<>();
        m.put("VISIT_DAYS",number(row.get("visitDays")));m.put("PIXEL_COUNT",number(row.get("pixelCount")));
        m.put("PLANT_COUNT",number(row.get("plantCount")));m.put("SPECIES_COUNT",number(row.get("speciesCount")));
        m.put("PERFECT_COUNT",number(row.get("perfectCount")));m.put("NOTE_COUNT",number(row.get("noteCount")));
        m.put("MAX_STREAK",number(row.get("maxStreak")));
        m.put("COMPLETED_TYPE_COUNT",number(row.get("completedTypeCount")));m.put("LONG_BOARD_COUNT",number(row.get("longBoardCount")));return m;
    }
    private String grade(int xp) {
        if (xp >= 150) return "CONSERVATOR";
        if (xp >= 120) return "BOTANIST";
        if (xp >= 90) return "GARDENER";
        if (xp >= 60) return "GROVE";
        if (xp >= 30) return "SPROUT";
        return "SEED";
    }

    private List<Map<String, Object>> gradeGuide() { return List.of(Map.of("code","SEED","xp",0,"species",2),Map.of("code","SPROUT","xp",30,"species",4),Map.of("code","GROVE","xp",60,"species",6),Map.of("code","GARDENER","xp",90,"species",8),Map.of("code","BOTANIST","xp",120,"species",10),Map.of("code","CONSERVATOR","xp",150,"species",12)); }
    private int poolLimit(String grade){return switch(grade){case"SPROUT"->4;case"GROVE"->6;case"GARDENER"->8;case"BOTANIST"->10;case"CONSERVATOR"->12;default->2;};}
    private Map<String,Object> weightedPick(List<Map<String,Object>> pool){int total=pool.stream().mapToInt(v->number(v.get("weightValue"))).sum();int roll=ThreadLocalRandom.current().nextInt(total);for(Map<String,Object> item:pool){roll-=number(item.get("weightValue"));if(roll<0)return item;}return pool.get(0);}
    private String safeLocale(String locale) { return Set.of("en","ko","zh","ja").contains(locale) ? locale : "en"; }
    private int number(Object value) { return value instanceof Number n ? n.intValue() : Integer.parseInt(String.valueOf(value)); }
}
