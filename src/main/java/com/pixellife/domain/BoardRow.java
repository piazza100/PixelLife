package com.pixellife.domain;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class BoardRow {
    private Long id;
    private Long userId;
    private String name;
    private String boardType;
    private String color;
    private String rewardSpeciesCode;
    private String rewardSpeciesName;
    private String rewardSpeciesSymbol;
    private String rewardColorCode;
    private LocalDate startDate;
    private Integer goalDays;
    private String status;
    private LocalDate endedAt;
    private LocalDateTime completedAt;
    private Integer finalScore;
    private Integer xpAwarded;
    private LocalDateTime createdAt;

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
    public String getRewardSpeciesCode() { return rewardSpeciesCode; }
    public void setRewardSpeciesCode(String rewardSpeciesCode) { this.rewardSpeciesCode = rewardSpeciesCode; }
    public String getRewardSpeciesName() { return rewardSpeciesName; }
    public void setRewardSpeciesName(String rewardSpeciesName) { this.rewardSpeciesName = rewardSpeciesName; }
    public String getRewardSpeciesSymbol() { return rewardSpeciesSymbol; }
    public void setRewardSpeciesSymbol(String rewardSpeciesSymbol) { this.rewardSpeciesSymbol = rewardSpeciesSymbol; }
    public String getRewardColorCode() { return rewardColorCode; }
    public void setRewardColorCode(String rewardColorCode) { this.rewardColorCode = rewardColorCode; }
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
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
