package com.pixellife.service;

import com.pixellife.domain.BoardRow;
import com.pixellife.mapper.PixelLifeMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PixelLifeServiceTest {
    private final PixelLifeMapper mapper = mock(PixelLifeMapper.class);
    private final PixelLifeService service = new PixelLifeService(mapper, new BoardScoringService());

    @BeforeEach
    void memberDefaults() {
        when(mapper.findMember(1L)).thenReturn(Map.of("plan", "FREE"));
        when(mapper.findProgress(1L)).thenReturn(Map.of("totalXp", 0, "gradeCode", "SEED"));
        when(mapper.findSpeciesPool(2)).thenReturn(List.of(
            Map.of("code", "OAK", "name", "Oak", "symbol", "♣", "weightValue", 1),
            Map.of("code", "CACTUS", "name", "Cactus", "symbol", "♜", "weightValue", 1)
        ));
        when(mapper.findUnlockedColors(1L)).thenReturn(List.of(
            Map.of("code", "GREEN", "cssColor", "#159651"),
            Map.of("code", "CREAM", "cssColor", "#D8CFAF")
        ));
    }

    @Test
    void serializesBoardCreationBeforeCheckingThePlanLimit() {
        when(mapper.findBoardCreationContextForUpdate(1L)).thenReturn(Map.of("plan", "FREE", "gradeCode", "SEED", "activeCount", 0));
        when(mapper.findBoards(1L)).thenReturn(List.of());

        service.createBoard(1L, "Read", "LEVEL", LocalDate.now(), 30);

        var order = inOrder(mapper);
        order.verify(mapper).findBoardCreationContextForUpdate(1L);
        verify(mapper).insertBoard(any(BoardRow.class));
    }

    @Test
    void freeMemberCanKeepThreeActiveBoardsButNotFour() {
        when(mapper.findBoardCreationContextForUpdate(1L)).thenReturn(
            Map.of("plan", "FREE", "gradeCode", "SEED", "activeCount", 2),
            Map.of("plan", "FREE", "gradeCode", "SEED", "activeCount", 3));
        when(mapper.findBoards(1L)).thenReturn(List.of());

        service.createBoard(1L, "Third", "LEVEL", LocalDate.now(), 30);

        assertThatThrownBy(() -> service.createBoard(1L, "Fourth", "LEVEL", LocalDate.now(), 30))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Your plan allows 3 active boards");
        verify(mapper, times(1)).insertBoard(any(BoardRow.class));
    }

    @Test
    void plusMemberCanUseTenActiveBoardsButNotEleven() {
        when(mapper.findBoardCreationContextForUpdate(1L)).thenReturn(Map.of(
            "plan", "PLUS",
            "paidUntil", LocalDateTime.now().plusDays(10),
            "gradeCode", "SEED",
            "activeCount", 9
        ), Map.of(
            "plan", "PLUS",
            "paidUntil", LocalDateTime.now().plusDays(10),
            "gradeCode", "SEED",
            "activeCount", 10
        ));

        when(mapper.findBoards(1L)).thenReturn(List.of());
        service.createBoard(1L, "Tenth", "MOOD", LocalDate.now(), 30);

        assertThatThrownBy(() -> service.createBoard(1L, "Eleventh", "MOOD", LocalDate.now(), 30))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Your plan allows 10 active boards");
        verify(mapper, times(1)).insertBoard(any(BoardRow.class));
    }

    @Test
    void freeMemberCanKeepWritingExistingBoardsAfterPlusEnds() {
        BoardRow oldBoard = board(LocalDate.now().minusDays(10), LocalDateTime.now().minusDays(10), 30);
        oldBoard.setId(9L);
        when(mapper.findBoard(9L, 1L)).thenReturn(oldBoard);

        service.saveEntry(1L, 9L, LocalDate.now(), 3, null, null, null);

        verify(mapper).upsertEntry(9L, LocalDate.now(), 3, null, null, null);
    }

    @Test
    void customGoalMustBeAtLeastThreeDays() {
        when(mapper.findBoardCreationContextForUpdate(1L)).thenReturn(Map.of("plan", "FREE", "gradeCode", "SEED", "activeCount", 0));

        assertThatThrownBy(() -> service.createBoard(1L, "Too short", "LEVEL", LocalDate.now(), 2))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Goal days must be between 3 and 3650");

        verify(mapper, never()).insertBoard(any(BoardRow.class));
    }

    @Test
    void sameDayBoardCannotBeCompletedForXp() {
        BoardRow board = board(LocalDate.now(), LocalDateTime.now(), 30);
        when(mapper.findBoard(10L, 1L)).thenReturn(board);

        assertThatThrownBy(() -> service.complete(1L, 10L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("can finish on");

        verify(mapper, never()).completeBoard(anyLong(), anyLong(), anyInt(), anyInt());
        verify(mapper, never()).addXp(anyLong(), anyInt());
    }

    @Test
    void finishDateUsesBoardStartInsteadOfCreatedTime() {
        BoardRow board = board(LocalDate.now(), LocalDateTime.now().minusDays(30), null);
        when(mapper.findBoard(10L, 1L)).thenReturn(board);

        assertThatThrownBy(() -> service.complete(1L, 10L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining(LocalDate.now().plusDays(6).toString());

        verify(mapper, never()).completeBoard(anyLong(), anyLong(), anyInt(), anyInt());
    }

    @Test
    void fixedGoalBoardOpensAtTheHalfwayDay() {
        LocalDate start = LocalDate.now().minusDays(13);
        BoardRow board = board(start, LocalDateTime.now().minusDays(30), 30);
        when(mapper.findBoard(10L, 1L)).thenReturn(board);

        assertThatThrownBy(() -> service.complete(1L, 10L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining(start.plusDays(14).toString());

        verify(mapper, never()).completeBoard(anyLong(), anyLong(), anyInt(), anyInt());
    }

    @Test
    void duplicateCompletionNeverAwardsXpTwice() {
        BoardRow board = board(LocalDate.now().minusDays(10), LocalDateTime.now().minusDays(10), 7);
        when(mapper.findBoard(10L, 1L)).thenReturn(board);
        when(mapper.countEntries(10L)).thenReturn(7);
        when(mapper.countNotes(10L)).thenReturn(2);
        when(mapper.completeBoard(10L, 1L, 100, 7)).thenReturn(0);

        assertThatThrownBy(() -> service.complete(1L, 10L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Board could not be completed");

        verify(mapper).lockMember(1L);
        verify(mapper, never()).addXp(anyLong(), anyInt());
        verify(mapper, never()).insertPlant(anyLong(), anyLong(), anyString(), anyString(), anyInt(), anyInt());
    }

    @Test
    void savingTheSameDateUsesTheDatabaseUpsertKey() {
        BoardRow board = board(LocalDate.now().minusDays(2), LocalDateTime.now().minusDays(2), 30);
        when(mapper.findBoard(10L, 1L)).thenReturn(board);

        service.saveEntry(1L, 10L, LocalDate.now(), 4, null, null, " done ");

        verify(mapper).upsertEntry(10L, LocalDate.now(), 4, null, null, "done");
    }

    @Test
    void checkBoardPersistsAnExplicitNoValue() {
        BoardRow board = board(LocalDate.now().minusDays(2), LocalDateTime.now().minusDays(2), 30);
        board.setBoardType("CHECK");
        when(mapper.findBoard(10L, 1L)).thenReturn(board);

        service.saveEntry(1L, 10L, LocalDate.now(), null, false, null, null);

        verify(mapper).upsertEntry(10L, LocalDate.now(), null, false, null, null);
    }

    @Test
    void deletesOnlyAnActiveWritableBoard() {
        when(mapper.deleteActiveBoard(10L, 1L)).thenReturn(1);

        service.deleteBoard(1L, 10L);

        verify(mapper).deleteActiveBoard(10L, 1L);
    }

    @Test
    void completedBoardCannotBeDeletedToFarmXpAgain() {
        when(mapper.deleteActiveBoard(10L, 1L)).thenReturn(0);

        assertThatThrownBy(() -> service.deleteBoard(1L, 10L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Board could not be deleted");

        verify(mapper).deleteActiveBoard(10L, 1L);
    }

    @Test
    void fillsPastDatesForAllowedManualTestUse() {
        BoardRow board = board(LocalDate.now().minusDays(9), LocalDateTime.now().minusDays(9), 30);
        when(mapper.findBoard(10L, 1L)).thenReturn(board);

        Map<String, Object> result = service.fillTestEntries(1L, 10L, 7);

        verify(mapper, times(7)).upsertEntry(eq(10L), any(LocalDate.class), anyInt(), isNull(), isNull(), anyString());
        verify(mapper).touchBoard(10L);
        org.assertj.core.api.Assertions.assertThat(result.get("saved")).isEqualTo(7);
    }

    @Test
    void fillsOneSpecificDateUsingTheBoardType() {
        LocalDate date = LocalDate.now().minusDays(2);
        BoardRow board = board(LocalDate.now().minusDays(9), LocalDateTime.now().minusDays(9), 30);
        board.setBoardType("CHECK");
        when(mapper.findBoard(10L, 1L)).thenReturn(board);

        Map<String, Object> result = service.fillTestEntries(1L, 10L, date, date);

        verify(mapper).upsertEntry(10L, date, null, true, null, "Test day 1");
        org.assertj.core.api.Assertions.assertThat(result.get("saved")).isEqualTo(1);
        org.assertj.core.api.Assertions.assertThat(result.get("type")).isEqualTo("CHECK");
    }

    private BoardRow board(LocalDate start, LocalDateTime created, Integer goalDays) {
        BoardRow board = new BoardRow();
        board.setId(10L);
        board.setUserId(1L);
        board.setName("Test");
        board.setBoardType("LEVEL");
        board.setStartDate(start);
        board.setCreatedAt(created);
        board.setGoalDays(goalDays);
        board.setEndedAt(goalDays == null ? null : start.plusDays(goalDays - 1L));
        board.setStatus("ACTIVE");
        return board;
    }
}
