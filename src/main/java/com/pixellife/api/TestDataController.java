package com.pixellife.api;

import com.pixellife.service.PixelLifeService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@Profile({"local", "staging"})
@RequestMapping("/api/test")
public class TestDataController {
    private final PixelLifeService service;
    private final Set<String> allowedEmails;

    public TestDataController(PixelLifeService service, @Value("${app.testing.allowed-emails:}") String allowedEmails) {
        this.service = service;
        this.allowedEmails = Arrays.stream(allowedEmails.split(",")).map(String::trim)
            .filter(value -> !value.isBlank()).collect(Collectors.toUnmodifiableSet());
    }

    @PostMapping("/boards/{boardId}/fill")
    public java.util.Map<String, Object> fill(@AuthenticationPrincipal OidcUser user,
                                              @PathVariable long boardId,
                                              @RequestParam(defaultValue = "7") int days) {
        if (!allowedEmails.contains(user.getEmail())) throw new TestAccessDeniedException();
        return service.fillTestEntries(service.memberId(user.getSubject()), boardId, days);
    }

    @ResponseStatus(HttpStatus.FORBIDDEN)
    private static class TestAccessDeniedException extends RuntimeException {}
}
