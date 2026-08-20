package com.pixellife.api;

import com.pixellife.domain.BoardRow;
import com.pixellife.service.PixelLifeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PixelLifeController {
    private final PixelLifeService service;
    public PixelLifeController(PixelLifeService service) { this.service = service; }

    @GetMapping("/bootstrap")
    public Map<String, Object> bootstrap(@AuthenticationPrincipal OidcUser user, @RequestParam(defaultValue="en") String locale) {
        return service.bootstrap(memberId(user, locale));
    }

    @GetMapping("/me")
    public Map<String,Object> me(@AuthenticationPrincipal OidcUser user, @RequestParam(defaultValue="en") String locale) { return service.member(memberId(user, locale)); }

    @GetMapping("/csrf")
    public Map<String,String> csrf(CsrfToken token) { return Map.of("token", token.getToken()); }

    @PostMapping("/boards") @ResponseStatus(HttpStatus.CREATED)
    public BoardRow create(@AuthenticationPrincipal OidcUser user, @Valid @RequestBody CreateBoard request) {
        return service.createBoard(memberId(user, "en"), request.name(), request.type(), request.startDate(), request.goalDays());
    }

    @PostMapping("/boards/import") @ResponseStatus(HttpStatus.CREATED)
    public BoardRow importGuestBoard(@AuthenticationPrincipal OidcUser user, @Valid @RequestBody ImportBoard request) {
        return service.importGuestBoard(memberId(user, "en"), request.name(), request.type(), request.startDate(), request.goalDays(),
            request.entries().stream().map(entry -> new PixelLifeService.GuestEntry(entry.date(), entry.value(), entry.success(), entry.emoji(), entry.note())).toList());
    }

    @GetMapping("/boards/{boardId}")
    public Map<String,Object> board(@AuthenticationPrincipal OidcUser user, @PathVariable long boardId) { return service.board(memberId(user,"en"), boardId); }

    @PutMapping("/boards/{boardId}/entries/{date}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void saveEntry(@AuthenticationPrincipal OidcUser user, @PathVariable long boardId, @PathVariable LocalDate date, @Valid @RequestBody SaveEntry request) {
        service.saveEntry(memberId(user,"en"), boardId, date, request.value(), request.success(), request.emoji(), request.note());
    }

    @DeleteMapping("/boards/{boardId}/entries/{date}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetEntry(@AuthenticationPrincipal OidcUser user, @PathVariable long boardId, @PathVariable LocalDate date) { service.deleteEntry(memberId(user,"en"), boardId, date); }

    @PostMapping("/boards/{boardId}/complete")
    public Map<String,Object> complete(@AuthenticationPrincipal OidcUser user, @PathVariable long boardId) { return service.complete(memberId(user,"en"), boardId); }

    @GetMapping("/rewards")
    public Map<String,Object> rewards(@AuthenticationPrincipal OidcUser user) { return service.rewards(memberId(user,"en")); }

    @DeleteMapping("/me") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@AuthenticationPrincipal OidcUser user) { service.deleteAccount(memberId(user,"en")); }

    private long memberId(OidcUser user, String locale) {
        return service.ensureMember(user.getSubject(), user.getEmail(), user.getFullName(), user.getPicture(), locale);
    }

    public record CreateBoard(@NotBlank @Size(max=80) String name, @NotBlank String type, LocalDate startDate, @Min(1) @Max(3650) Integer goalDays) {}
    public record ImportBoard(@NotBlank @Size(max=80) String name, @NotBlank String type, @NotNull LocalDate startDate,
                              @Min(1) @Max(3650) Integer goalDays,
                              @NotNull @Size(max=3650) List<@Valid ImportEntry> entries) {}
    public record ImportEntry(@NotNull LocalDate date, @Min(1) @Max(5) Integer value, Boolean success,
                              @Size(max=16) String emoji, @Size(max=280) String note) {}
    public record SaveEntry(@Min(1) @Max(5) Integer value, Boolean success, @Size(max=16) String emoji, @Size(max=280) String note) {}
}
