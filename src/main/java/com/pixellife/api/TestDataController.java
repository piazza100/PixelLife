package com.pixellife.api;

import com.pixellife.service.PixelLifeService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

@RestController
@RequestMapping("/api/test")
public class TestDataController {
    private final PixelLifeService service;
    private final Set<String> allowedEmails;

    public TestDataController(PixelLifeService service,
                              @Value("${app.testing.allowed-emails:}") String allowedEmails) {
        this.service = service;
        this.allowedEmails = Arrays.stream(allowedEmails.split(",")).map(String::trim)
            .filter(value -> !value.isBlank()).collect(Collectors.toUnmodifiableSet());
    }

    @GetMapping("/boards")
    public List<Map<String, Object>> boards(@AuthenticationPrincipal OidcUser user) {
        return service.testBoards(allowedUserId(user));
    }

    @GetMapping("/users")
    public List<Map<String, Object>> users(@AuthenticationPrincipal OidcUser user) {
        allowedUserId(user);
        return service.testUsers();
    }

    @GetMapping("/users/{userId}/boards")
    public List<Map<String, Object>> userBoards(@AuthenticationPrincipal OidcUser user, @PathVariable long userId) {
        allowedUserId(user);
        return service.testBoards(userId);
    }

    @PostMapping("/users/{userId}/boards")
    @ResponseStatus(HttpStatus.CREATED)
    public Object createBoard(@AuthenticationPrincipal OidcUser user, @PathVariable long userId,
                              @Valid @RequestBody TestBoardRequest request) {
        allowedUserId(user);
        return service.createBoard(userId, request.name(), request.type(), request.startDate(), request.goalDays());
    }

    @PostMapping("/users/{userId}/boards/{boardId}/fill")
    public Map<String, Object> fillUserBoard(@AuthenticationPrincipal OidcUser user,
                                             @PathVariable long userId, @PathVariable long boardId,
                                             @RequestParam(required = false) Integer days,
                                             @RequestParam(required = false) LocalDate date,
                                             @RequestParam(required = false) LocalDate from,
                                             @RequestParam(required = false) LocalDate to) {
        allowedUserId(user);
        if (date != null) return service.fillTestEntries(userId, boardId, date, date);
        if (from != null || to != null) {
            if (from == null || to == null) throw new IllegalArgumentException("Both from and to are required");
            return service.fillTestEntries(userId, boardId, from, to);
        }
        return service.fillTestEntries(userId, boardId, days == null ? 7 : days);
    }

    public record TestBoardRequest(@NotBlank @Size(max=24) String name, @NotBlank String type,
                                   @NotNull LocalDate startDate, @Min(3) @Max(3650) Integer goalDays) {}

    @PostMapping("/boards/{boardId}/fill")
    public java.util.Map<String, Object> fill(@AuthenticationPrincipal OidcUser user,
                                              @PathVariable long boardId,
                                              @RequestParam(required = false) Integer days,
                                              @RequestParam(required = false) LocalDate date,
                                              @RequestParam(required = false) LocalDate from,
                                              @RequestParam(required = false) LocalDate to) {
        long userId = allowedUserId(user);
        if (date != null) return service.fillTestEntries(userId, boardId, date, date);
        if (from != null || to != null) {
            if (from == null || to == null) throw new IllegalArgumentException("Both from and to are required");
            return service.fillTestEntries(userId, boardId, from, to);
        }
        return service.fillTestEntries(userId, boardId, days == null ? 7 : days);
    }

    private long allowedUserId(OidcUser user) {
        if (user == null || !allowedEmails.contains(user.getEmail())) throw new TestAccessDeniedException();
        return service.memberId(user.getSubject());
    }

    @ResponseStatus(HttpStatus.FORBIDDEN)
    private static class TestAccessDeniedException extends RuntimeException {}
}
