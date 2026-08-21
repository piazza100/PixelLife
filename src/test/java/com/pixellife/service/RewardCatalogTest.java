package com.pixellife.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RewardCatalogTest {
    private static final List<String> REWARD_COLORS = List.of(
        "#159651", "#D8CFAF", "#4F8FD8", "#D6763E", "#8967C7", "#C85F7A",
        "#D3A62B", "#54BFA3", "#2F8C83", "#5666A5", "#D96F62", "#B94C5B", "#62707D"
    );

    @Test
    void rewardCatalogHasTwoBaseColorsAndNoDuplicates() {
        assertEquals(13, REWARD_COLORS.size());
        assertEquals(13, REWARD_COLORS.stream().distinct().count());
        assertEquals(List.of("#159651", "#D8CFAF"), REWARD_COLORS.subList(0, 2));
    }

    @Test
    void flywayCatalogDefinesTwelveUniqueSpeciesAndThirteenCanonicalColors() throws Exception {
        String v5;
        try (var input = getClass().getResourceAsStream("/db/migration/V5__simplify_rewards_and_add_garden_map.sql")) {
            v5 = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        String v9;
        try (var input = getClass().getResourceAsStream("/db/migration/V9__equalize_plant_weights_and_distinguish_symbols.sql")) {
            v9 = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        for (String code : List.of("OAK","CACTUS","TULIP","PINE","FERN","SUNFLOWER","MAPLE","LOTUS","BAMBOO","CHERRY","PALM","CRYSTAL"))
            assertTrue(v5.contains("('" + code + "'"), code);
        for (String color : REWARD_COLORS) assertTrue(v5.contains(color), color);
        assertTrue(v9.contains("UPDATE plant_species SET weight_value = 1"));
        assertTrue(v9.contains("unicode_symbol = '❈' WHERE code = 'MAPLE'"));
    }
}
