package com.pixellife.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BoardScoringServiceTest {
    private final BoardScoringService scoring = new BoardScoringService();

    @Test void perfectBoardGetsOneHundredPoints() {
        var result = scoring.score(30, 30, 6);
        assertThat(result.points()).isEqualTo(100);
        assertThat(result.xp()).isEqualTo(30);
    }

    @Test void scoreIsCappedAtOneHundred() {
        var result = scoring.score(30, 50, 50);
        assertThat(result.points()).isEqualTo(100);
        assertThat(result.xp()).isEqualTo(30);
    }

    @Test void partialBoardKeepsSimpleProportionalScore() {
        var result = scoring.score(30, 15, 0);
        assertThat(result.points()).isEqualTo(50);
        assertThat(result.xp()).isEqualTo(15);
    }
}
