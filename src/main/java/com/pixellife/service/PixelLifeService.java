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
    private static final List<String> COLORS = List.of("#159651", "#3878D8", "#D6763E", "#8967C7", "#397D73", "#B56D50", "#A55B76", "#507F39");
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
        mapper.recordVisit(id, LocalDate.now());
        return id;
    }

    public long memberId(String subject) {
        Long id = mapper.findMemberId("GOOGLE", subject);
        if (id == null) throw new NoSuchElementException("Account not found");
        return id;
    }

    public Map<String,Object> member(long userId) {
        Map<String,Object> result = new HashMap<>(mapper.findMember(userId));
        result.put("effectivePlan", isPlus(result) ? "PLUS" : "FREE");
        result.put("activeBoardLimit", isPlus(result) ? 30 : 1);
        result.put("writableBoardId", mapper.findWritableBoardId(userId));
        return result;
    }

    @Transactional
    public void deleteAccount(long userId) {
        Map<String,Object> account = mapper.findMember(userId);
        if (account == null) throw new NoSuchElementException("Account not found");
        if (isPlus(account)) throw new IllegalStateException("Cancel Plus and wait until the paid period ends before deleting your account");
        if (mapper.deleteMember(userId) != 1) throw new IllegalStateException("Account could not be deleted");
    }

    public Map<String, Object> bootstrap(long userId) {
        return Map.of("boards", mapper.findBoards(userId), "entries", mapper.findEntriesForUser(userId), "rewards", rewards(userId));
    }

    @Transactional
    public BoardRow createBoard(long userId, String name, String type, LocalDate startDate, Integer goalDays) {
        mapper.lockMember(userId);
        Map<String,Object> account = mapper.findMember(userId);
        int limit = isPlus(account) ? 30 : 1;
        if (mapper.countActiveBoards(userId) >= limit) throw new IllegalStateException("Your plan allows " + limit + " active board" + (limit == 1 ? "" : "s"));
        String boardType = switch (type == null ? "" : type.toUpperCase(Locale.ROOT)) {
            case "LEVEL", "CHECK", "MOOD" -> type.toUpperCase(Locale.ROOT);
            default -> throw new IllegalArgumentException("Unsupported board type");
        };
        if (name == null || name.isBlank() || name.length() > 24) throw new IllegalArgumentException("Board name must be 1 to 24 characters");
        if (goalDays != null && (goalDays < 3 || goalDays > 3650)) throw new IllegalArgumentException("Goal days must be between 3 and 3650");
        LocalDate safeStartDate = startDate == null ? LocalDate.now() : startDate;
        if (safeStartDate.isAfter(LocalDate.now())) throw new IllegalArgumentException("Start date cannot be in the future");
        BoardRow board = new BoardRow(); board.setUserId(userId); board.setName(name.trim()); board.setBoardType(boardType);
        board.setColor(randomColor(userId)); board.setStartDate(safeStartDate); board.setGoalDays(goalDays); board.setStatus("ACTIVE");
        if (goalDays != null) board.setEndedAt(board.getStartDate().plusDays(goalDays - 1L));
        mapper.insertBoard(board); return board;
    }

    @Transactional
    public BoardRow importGuestBoard(long userId, String name, String type, LocalDate startDate, Integer goalDays, List<GuestEntry> entries) {
        if (mapper.countActiveBoards(userId) > 0) throw new IllegalStateException("Finish your current board before importing a guest board");
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
            return item;
        }).toList();
    }

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
        int remainingDailyXp = Math.max(0, 100 - mapper.sumXpAwardedOnDate(userId, LocalDate.now(ZoneOffset.UTC)));
        int awardedXp = Math.min(result.xp(), remainingDailyXp);
        if (mapper.completeBoard(boardId, userId, result.points(), awardedXp) != 1) throw new IllegalStateException("Board could not be completed");
        if (awardedXp > 0) mapper.addXp(userId, awardedXp);
        int totalXp = number(mapper.findProgress(userId).get("totalXp"));
        String grade = grade(totalXp); mapper.updateGrade(userId, grade);
        Map<String,Object> plantSpecies = weightedPick(mapper.findSpeciesPool(poolLimit(grade)));
        List<Map<String,Object>> colors = mapper.findUnlockedColors(userId);
        Map<String,Object> plantColor = colors.get(ThreadLocalRandom.current().nextInt(colors.size()));
        int index = mapper.nextPlantIndex(userId);
        mapper.insertPlant(userId, boardId, String.valueOf(plantSpecies.get("code")), String.valueOf(plantColor.get("code")), index % 12, index / 12);
        refreshRewards(userId);
        return Map.of("score", result.points(), "xp", awardedXp, "grade", grade, "species", plantSpecies, "color", plantColor);
    }

    @Transactional
    public Map<String, Object> rewards(long userId) {
        refreshRewards(userId);
        Map<String, Object> progress = new HashMap<>(mapper.findProgress(userId));
        progress.put("badges", badgeProgress(userId)); progress.put("plants", mapper.findPlants(userId));
        String grade=String.valueOf(progress.get("gradeCode"));List<Map<String,Object>> pool=mapper.findSpeciesPool(poolLimit(grade));int total=pool.stream().mapToInt(v->number(v.get("weightValue"))).sum();
        pool.forEach(v->v.put("chance",Math.round(number(v.get("weightValue"))*1000d/total)/10d));
        progress.put("speciesPool",pool);progress.put("unlockedColors",mapper.findUnlockedColors(userId));progress.put("gradeGuide", gradeGuide()); return progress;
    }

    private BoardRow requireBoard(long userId, long boardId) {
        BoardRow board = mapper.findBoard(boardId, userId); if (board == null) throw new NoSuchElementException("Board not found"); return board;
    }

    private void requireWritable(long userId, long boardId) {
        Map<String,Object> account = mapper.findMember(userId);
        if (isPlus(account)) return;
        Long writable = mapper.findWritableBoardId(userId);
        if (writable != null && writable != boardId) throw new IllegalStateException("This board is read-only on the Free plan");
    }

    private boolean isPlus(Map<String,Object> account) {
        if (account == null || !"PLUS".equals(String.valueOf(account.get("plan")))) return false;
        Object paidUntil = account.get("paidUntil");
        return paidUntil instanceof LocalDateTime time && !time.isBefore(LocalDateTime.now(ZoneOffset.UTC));
    }

    private String randomColor(long userId) {
        List<BoardRow> boards = mapper.findBoards(userId); String last = boards.isEmpty() ? null : boards.get(0).getColor();
        List<String> choices = COLORS.stream().filter(c -> !c.equals(last)).toList(); return choices.get(ThreadLocalRandom.current().nextInt(choices.size()));
    }

    private void refreshRewards(long userId) {
        Map<String, Integer> metrics = metrics(userId);
        for (Map<String, Object> badge : mapper.findBadges(userId)) {
            boolean earned = Boolean.TRUE.equals(badge.get("earned")) || number(badge.get("earned")) == 1;
            int current = metrics.getOrDefault(String.valueOf(badge.get("metricCode")), 0);
            if (!earned && current >= number(badge.get("targetValue"))) mapper.awardBadge(userId, String.valueOf(badge.get("code")));
        }
        Map<String, Object> progress = mapper.findProgress(userId); String grade = grade(number(progress.get("totalXp")));
        if (!grade.equals(progress.get("gradeCode"))) mapper.updateGrade(userId, grade);
    }

    private List<Map<String, Object>> badgeProgress(long userId) {
        Map<String, Integer> metrics = metrics(userId); List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> source : mapper.findBadges(userId)) { Map<String, Object> item = new HashMap<>(source); item.put("currentValue", metrics.getOrDefault(String.valueOf(source.get("metricCode")), 0)); result.add(item); }
        return result;
    }

    private Map<String, Integer> metrics(long userId) { Map<String,Integer> m=new HashMap<>();m.put("VISIT_DAYS",mapper.countVisits(userId));m.put("PIXEL_COUNT",mapper.countPixels(userId));m.put("PLANT_COUNT",mapper.countPlants(userId));m.put("SPECIES_COUNT",mapper.countSpecies(userId));m.put("PERFECT_COUNT",mapper.countPerfect(userId));m.put("NOTE_COUNT",mapper.countAllNotes(userId));m.put("MAX_STREAK",Optional.ofNullable(mapper.maxRecordStreak(userId)).orElse(0));m.put("COMPLETED_TYPE_COUNT",mapper.countCompletedTypes(userId));m.put("LONG_BOARD_COUNT",mapper.countLongBoards(userId));return m; }
    private String grade(int xp) {
        if (xp >= 3000) return "CONSERVATOR";
        if (xp >= 1500) return "BOTANIST";
        if (xp >= 700) return "GARDENER";
        if (xp >= 300) return "GROVE";
        if (xp >= 100) return "SPROUT";
        return "SEED";
    }

    private List<Map<String, Object>> gradeGuide() { return List.of(Map.of("code","SEED","xp",0,"species",2),Map.of("code","SPROUT","xp",100,"species",4),Map.of("code","GROVE","xp",300,"species",6),Map.of("code","GARDENER","xp",700,"species",8),Map.of("code","BOTANIST","xp",1500,"species",10),Map.of("code","CONSERVATOR","xp",3000,"species",12)); }
    private int poolLimit(String grade){return switch(grade){case"SPROUT"->4;case"GROVE"->6;case"GARDENER"->8;case"BOTANIST"->10;case"CONSERVATOR"->12;default->2;};}
    private Map<String,Object> weightedPick(List<Map<String,Object>> pool){int total=pool.stream().mapToInt(v->number(v.get("weightValue"))).sum();int roll=ThreadLocalRandom.current().nextInt(total);for(Map<String,Object> item:pool){roll-=number(item.get("weightValue"));if(roll<0)return item;}return pool.get(0);}
    private String safeLocale(String locale) { return Set.of("en","ko","zh","ja").contains(locale) ? locale : "en"; }
    private int number(Object value) { return value instanceof Number n ? n.intValue() : Integer.parseInt(String.valueOf(value)); }
}
