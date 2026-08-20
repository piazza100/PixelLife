package com.pixellife.domain;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class BoardRow {
    private Long id;
    private Long userId;
    private String name;
    private String boardType;
    private String color;
    private LocalDate startDate;
    private Integer goalDays;
    private String status;
    private LocalDate endedAt;
    private LocalDateTime completedAt;
    private Integer finalScore;
    private Integer xpAwarded;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getBoardType() { return boardType; }
    public void setBoardType(String boardType) { this.boardType = boardType; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public Integer getGoalDays() { return goalDays; }
    public void setGoalDays(Integer goalDays) { this.goalDays = goalDays; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDate getEndedAt() { return endedAt; }
    public void setEndedAt(LocalDate endedAt) { this.endedAt = endedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public Integer getFinalScore() { return finalScore; }
    public void setFinalScore(Integer finalScore) { this.finalScore = finalScore; }
    public Integer getXpAwarded() { return xpAwarded; }
    public void setXpAwarded(Integer xpAwarded) { this.xpAwarded = xpAwarded; }
}
