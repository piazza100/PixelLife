package com.pixellife.service;

import org.springframework.stereotype.Component;

@Component
public class BoardScoringService {
    public Score score(int goalDays, int entryCount, int noteCount) {
        int safeGoal = Math.max(1, goalDays);
        int total = (int) Math.round(Math.min(1d, entryCount / (double) safeGoal) * 100d);
        return new Score(total, total);
    }

    public record Score(int points, int xp) {}
}
